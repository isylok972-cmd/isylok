import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json()
    const { client: clientData, evenement, lignes, fraisLivraison, nomZoneLivraison } = corps

    // 1. Validation minimale
    if (!clientData || !clientData.email || !clientData.nom) {
      return NextResponse.json(
        { succes: false, message: 'Nom et adresse e-mail requis' },
        { status: 400 }
      )
    }

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json(
        { succes: false, message: 'Le panier ne contient aucun article' },
        { status: 400 }
      )
    }

    const emailNormalise = clientData.email.trim().toLowerCase()

    // 2. Vérification / Dédoublonnage Client par e-mail
    let client = await prisma.client.findFirst({
      where: { email: emailNormalise }
    })

    if (client) {
      // Client existant : mise à jour enrichie si des informations sont renseignées
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          telephone: clientData.telephone || client.telephone,
          entreprise: clientData.entreprise || client.entreprise,
          siret: clientData.siret || client.siret,
          ville: clientData.ville || client.ville,
          adresse: clientData.adresse || client.adresse,
          type: clientData.siret ? 'PROFESSIONNEL' : client.type
        }
      })
    } else {
      // Nouveau Client
      client = await prisma.client.create({
        data: {
          nom: clientData.nom.trim(),
          prenom: clientData.prenom ? clientData.prenom.trim() : null,
          email: emailNormalise,
          telephone: clientData.telephone || '0596000000',
          entreprise: clientData.entreprise ? clientData.entreprise.trim() : null,
          siret: clientData.siret ? clientData.siret.trim() : null,
          ville: clientData.ville ? clientData.ville.trim() : (evenement?.commune || null),
          adresse: clientData.adresse ? clientData.adresse.trim() : null,
          type: clientData.siret ? 'PROFESSIONNEL' : 'PARTICULIER',
          statutApprobation: 'EN_ATTENTE'
        }
      })
    }

    // 3. Préparation des lignes du devis avec sécurisation des tarifs depuis la base
    const articleIds = lignes.map((l: any) => l.articleId).filter(Boolean)
    const articlesDb = articleIds.length > 0
      ? await prisma.article.findMany({ where: { id: { in: articleIds } } })
      : []
    const articlesMap = new Map(articlesDb.map(a => [a.id, a]))

    const lignesDevisData = lignes.map((l: any) => {
      const artDb = l.articleId ? articlesMap.get(l.articleId) : null
      const qte = Math.max(1, Number(l.quantite) || 1)
      const pu = l.prixUnitaire !== undefined && Number(l.prixUnitaire) > 0
        ? Number(l.prixUnitaire)
        : (artDb?.prixLocationJour || 0)
      const designation = l.designation || artDb?.nom || 'Article sur mesure'

      return {
        articleId: l.articleId || null,
        designation,
        description: l.description || (artDb?.reference ? `Réf: ${artDb.reference}` : null),
        quantite: qte,
        prixUnitaire: pu,
        remiseLigne: 0,
        totalLigne: Math.round(qte * pu * 100) / 100
      }
    })

    // Détection de la zone et des frais de livraison
    let montantLivraison = Number(fraisLivraison) || 0
    let zoneNom = nomZoneLivraison

    if (corps.zoneLivraisonId) {
      const zoneDb = await prisma.optionZoneLivraison.findUnique({ where: { id: corps.zoneLivraisonId } })
      if (zoneDb) {
        if (!montantLivraison) montantLivraison = zoneDb.tarifEstime
        if (!zoneNom) zoneNom = zoneDb.nomZone
      }
    }

    // Ajouter la ligne de transport si des frais sont applicables
    if (montantLivraison > 0) {
      lignesDevisData.push({
        articleId: null,
        designation: `Transport & Logistique — ${zoneNom || evenement?.commune || 'Martinique'}`,
        description: `Acheminement et reprise du matériel (${evenement?.commune ? `Commune : ${evenement.commune}` : 'Martinique'})`,
        quantite: 1,
        prixUnitaire: montantLivraison,
        remiseLigne: 0,
        totalLigne: montantLivraison
      })
    }

    // 4. Calculs financiers
    const sousTotal = Math.round(lignesDevisData.reduce((acc: number, l: any) => acc + l.totalLigne, 0) * 100) / 100
    const tauxTva = 8.5 // Taux normal DOM Martinique
    const montantTva = Math.round(sousTotal * (tauxTva / 100) * 100) / 100
    const totalTtc = Math.round((sousTotal + montantTva) * 100) / 100
    const acompte = Math.round(totalTtc * 0.3 * 100) / 100 // 30% acompte de réservation
    const resteAPayer = Math.round((totalTtc - acompte) * 100) / 100

    // 5. Numérotation et Créateur
    const count = await prisma.devis.count()
    const annee = new Date().getFullYear()
    const numero = genererNumero('DEV', annee, count + 1)

    let createur = await prisma.utilisateur.findUnique({ where: { email: 'web@isylok.local' } })
    if (!createur) {
      createur = await prisma.utilisateur.findFirst({ where: { role: 'ADMIN' } })
    }
    if (!createur) {
      createur = await prisma.utilisateur.findFirst()
    }

    const tokenSignature = crypto.randomUUID()

    // 6. Création du Devis
    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId: client.id,
        createurId: createur?.id || client.id,
        statut: 'BROUILLON',
        source: 'WEB',
        tokenSignature,
        dateEvenement: evenement?.date ? new Date(evenement.date) : null,
        lieuEvenement: evenement?.commune ? `${evenement.commune}, Martinique` : (evenement?.lieu || null),
        typeEvenement: evenement?.type || 'Événement Privé',
        sousTotal,
        remise: 0,
        tauxTva,
        montantTva,
        totalTtc,
        acompte,
        resteAPayer,
        notes: `Demande de devis générée en ligne via le site web vitrine Isy Lok.\nFormat : ${evenement?.format || 'Standard'}\nConvives estimés : ${evenement?.nombreInvites || 'Non spécifié'}`,
        lignes: {
          create: lignesDevisData
        }
      },
      include: {
        client: true,
        lignes: true
      }
    })

    return NextResponse.json({
      succes: true,
      devisId: devis.id,
      numero: devis.numero,
      tokenSignature,
      sousTotal: devis.sousTotal,
      totalHt: devis.sousTotal,
      montantTva: devis.montantTva,
      totalTtc: devis.totalTtc,
      acompte: devis.acompte,
      clientId: client.id,
      client: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
        email: client.email
      },
      lienSignature: `/devis/${tokenSignature}`,
      lignes: devis.lignes
    }, { status: 201 })
  } catch (err: any) {
    console.error('[API Web Demande Devis] Erreur:', err)
    return NextResponse.json(
      { succes: false, message: err.message || 'Erreur lors de la création du devis' },
      { status: 500 }
    )
  }
}
