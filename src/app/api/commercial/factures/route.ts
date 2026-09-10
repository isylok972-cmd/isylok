import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'

// Simulation d'envoi d'email
async function envoyerEmailDocument(type: 'Devis' | 'Facture', numero: string, clientEmail: string | null) {
  const parametres = await prisma.parametresEntreprise.findFirst()
  const emailEntreprise = parametres?.email || 'contact@isylok.fr'
  
  console.log(`\n==========================================`)
  console.log(`📨 SIMULATION ENVOI EMAIL : ${type} ${numero}`)
  console.log(`À : ${clientEmail || 'Client sans email'}`)
  console.log(`CC : ${emailEntreprise}`)
  console.log(`Message : La ${type.toLowerCase()} ${numero} a bien été générée (PDF en pièce jointe).`)
  console.log(`==========================================\n`)
}

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const statut = params.get('statut')
    
    const filtres: Record<string, unknown> = {}
    if (statut) filtres.statut = statut

    const factures = await prisma.facture.findMany({
      where: filtres,
      include: {
        client: { select: { id: true, nom: true, prenom: true, entreprise: true, type: true, siret: true } },
        devis: { select: { numero: true } }
      },
      orderBy: { dateCreation: 'desc' },
    })

    return NextResponse.json({ succes: true, donnees: factures })
  } catch (erreur) {
    console.error('[API Factures] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { devisId } = corps

    if (!devisId) {
      return NextResponse.json({ succes: false, message: 'ID du devis manquant' }, { status: 400 })
    }

    // Vérifier si le devis existe et est valide
    const devis = await prisma.devis.findUnique({ where: { id: devisId } })
    if (!devis) return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
    
    // Vérifier si une facture existe déjà pour ce devis
    const factureExistante = await prisma.facture.findUnique({ where: { devisId } })
    if (factureExistante) {
      return NextResponse.json({ succes: false, message: 'Une facture existe déjà pour ce devis' }, { status: 400 })
    }

    // Générer un numéro de facture
    const annee = new Date().getFullYear()
    const count = await prisma.facture.count({ where: { numero: { startsWith: `FAC-${annee}` } } })
    const numero = genererNumero('FAC', annee, count + 1)

    // Créer la facture et mettre à jour le statut du devis
    const resultat = await prisma.$transaction([
      prisma.facture.create({
        data: {
          numero,
          devisId,
          clientId: devis.clientId,
          statut: 'EMISE',
          montantHt: devis.sousTotal - devis.remise,
          tauxTva: devis.tauxTva ?? 8.5,
          montantTva: devis.montantTva,
          montantTtc: devis.totalTtc,
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours par défaut
        },
        include: { client: true, devis: true }
      }),
      prisma.devis.update({
        where: { id: devisId },
        data: { statut: 'FACTURE' }
      })
    ])

    const nouvelleFacture = resultat[0]
    
    // Simuler l'envoi de l'email
    await envoyerEmailDocument('Facture', nouvelleFacture.numero, nouvelleFacture.client.email)

    return NextResponse.json({ succes: true, donnees: nouvelleFacture }, { status: 201 })
  } catch (erreur) {
    console.error('[API Factures] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la création de la facture' }, { status: 400 })
  }
}
