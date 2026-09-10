// API pour un client individuel
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Détail complet d'un client
export async function GET(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        cautions: { orderBy: { dateCreation: 'desc' } },
        devis: { orderBy: { dateCreation: 'desc' }, take: 10, select: { id: true, numero: true, totalTtc: true, statut: true, dateEvenement: true, dateCreation: true } },
        factures: { orderBy: { dateCreation: 'desc' }, take: 10, select: { id: true, numero: true, montantTtc: true, statut: true, dateCreation: true } },
      },
    })
    if (!client) return NextResponse.json({ succes: false, message: 'Client introuvable' }, { status: 404 })
    return NextResponse.json({ succes: true, donnees: client })
  } catch (erreur) {
    console.error('[API Client] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — Modifier un client
export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const client = await prisma.client.update({
      where: { id },
      data: {
        type: corps.type,
        nom: corps.nom,
        prenom: corps.prenom,
        entreprise: corps.entreprise,
        siret: corps.siret,
        email: corps.email,
        telephone: corps.telephone,
        telephoneSecondaire: corps.telephoneSecondaire,
        adresse: corps.adresse,
        codePostal: corps.codePostal,
        ville: corps.ville,
        grillesTarifaires: corps.profilTarifaire,
        notes: corps.notes,
      },
      include: { cautions: true },
    })

    return NextResponse.json({ succes: true, donnees: client })
  } catch (erreur) {
    console.error('[API Client] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}

// PATCH — Mettre à jour partiellement un client (ex: statutApprobation)
export async function PATCH(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const data: any = {}
    if (corps.statutApprobation !== undefined) data.statutApprobation = corps.statutApprobation
    if (corps.nom !== undefined) data.nom = corps.nom
    if (corps.prenom !== undefined) data.prenom = corps.prenom
    if (corps.entreprise !== undefined) data.entreprise = corps.entreprise
    if (corps.siret !== undefined) data.siret = corps.siret
    if (corps.email !== undefined) data.email = corps.email
    if (corps.telephone !== undefined) data.telephone = corps.telephone
    if (corps.ville !== undefined) data.ville = corps.ville

    const client = await prisma.client.update({
      where: { id },
      data,
      include: { cautions: true, devis: true }
    })

    // Si on valide le client, basculer ses devis web en interne
    if (corps.statutApprobation === 'VALIDE') {
      await prisma.devis.updateMany({
        where: { clientId: id, source: 'WEB' },
        data: { source: 'INTERNE' }
      })
    }

    return NextResponse.json({ succes: true, donnees: client })
  } catch (erreur) {
    console.error('[API Client] Erreur PATCH:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur mise à jour client' }, { status: 500 })
  }
}

// DELETE — Supprimer un client ou prospect
export async function DELETE(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await prisma.$transaction(async tx => {
      // 1. Trouver les devis du client
      const devisIds = (await tx.devis.findMany({ where: { clientId: id }, select: { id: true } })).map(d => d.id)
      if (devisIds.length > 0) {
        await tx.ligneDevis.deleteMany({ where: { devisId: { in: devisIds } } })
        await tx.devis.deleteMany({ where: { id: { in: devisIds } } })
      }
      // 2. Supprimer les cautions éventuelles
      await tx.caution.deleteMany({ where: { clientId: id } })
      // 3. Supprimer le client
      await tx.client.delete({ where: { id } })
    })

    return NextResponse.json({ succes: true, message: 'Client ou prospect supprimé avec succès' })
  } catch (erreur) {
    console.error('[API Client] Erreur DELETE:', erreur)
    return NextResponse.json({ succes: false, message: 'Impossible de supprimer ce client' }, { status: 400 })
  }
}
