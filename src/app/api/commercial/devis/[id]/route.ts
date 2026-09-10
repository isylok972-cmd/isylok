import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simulation d'envoi d'email
async function envoyerEmailDocument(type: 'Devis' | 'Facture', numero: string, clientEmail: string | null) {
  const parametres = await prisma.parametresEntreprise.findFirst()
  const emailEntreprise = parametres?.email || 'contact@isylok.fr'
  
  console.log(`\n==========================================`)
  console.log(`📨 SIMULATION ENVOI EMAIL : ${type} ${numero}`)
  console.log(`À : ${clientEmail || 'Client sans email'}`)
  console.log(`CC : ${emailEntreprise}`)
  console.log(`Message : Le ${type.toLowerCase()} ${numero} a bien été généré (PDF en pièce jointe).`)
  console.log(`==========================================\n`)
}

export async function GET(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: { include: { article: true } },
        facture: true
      },
    })
    if (!devis) return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
    return NextResponse.json({ succes: true, donnees: devis })
  } catch (erreur) {
    console.error('[API Devis] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    // Si on veut juste changer le statut
    if (Object.keys(corps).length === 1 && corps.statut) {
      const devis = await prisma.devis.update({
        where: { id },
        data: { statut: corps.statut },
        include: { client: true }
      })
      
      // Si validé, on simule l'email
      if (corps.statut === 'VALIDE') {
        await envoyerEmailDocument('Devis', devis.numero, devis.client.email)
      }
      
      return NextResponse.json({ succes: true, donnees: devis })
    }

    // Sinon mise à jour complète (on simplifie en supprimant et recréant les lignes pour l'instant)
    await prisma.ligneDevis.deleteMany({ where: { devisId: id } })

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        clientId: corps.clientId,
        statut: corps.statut || 'BROUILLON',
        dateEvenement: corps.dateEvenement ? new Date(corps.dateEvenement) : null,
        lieuEvenement: corps.lieuEvenement || null,
        sousTotal: corps.sousTotal,
        tauxTva: typeof corps.tauxTva === 'number' ? corps.tauxTva : (corps.tauxTva !== undefined && corps.tauxTva !== null ? parseFloat(corps.tauxTva) : 8.5),
        montantTva: corps.montantTva,
        totalTtc: corps.totalTtc,
        ...(corps.source ? { source: corps.source } : {}),
        lignes: {
          create: corps.lignes.map((l: any) => ({
            articleId: l.articleId || null,
            designation: l.designation,
            description: l.description || null,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remiseLigne: l.remiseLigne || 0,
            totalLigne: l.totalLigne
          }))
        }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            type: true,
            email: true,
            telephone: true,
            statutApprobation: true
          }
        },
        lignes: true
      }
    })

    return NextResponse.json({ succes: true, donnees: devis })
  } catch (erreur) {
    console.error('[API Devis] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}

export async function DELETE(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.devis.delete({ where: { id } })
    return NextResponse.json({ succes: true, message: 'Devis supprimé' })
  } catch (erreur) {
    console.error('[API Devis] Erreur DELETE:', erreur)
    return NextResponse.json({ succes: false, message: 'Impossible de supprimer ce devis' }, { status: 400 })
  }
}
