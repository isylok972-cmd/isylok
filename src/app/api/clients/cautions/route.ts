// API CRUD pour les cautions (dépôts de garantie)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Liste des cautions (optionnel: par client)
export async function GET(requete: NextRequest) {
  try {
    const clientId = requete.nextUrl.searchParams.get('clientId')
    const statut = requete.nextUrl.searchParams.get('statut')

    const filtres: Record<string, unknown> = {}
    if (clientId) filtres.clientId = clientId
    if (statut) filtres.statut = statut

    const cautions = await prisma.caution.findMany({
      where: filtres,
      include: { client: { select: { id: true, nom: true, prenom: true, entreprise: true, type: true } } },
      orderBy: { dateCreation: 'desc' },
    })

    return NextResponse.json({ succes: true, donnees: cautions })
  } catch (erreur) {
    console.error('[API Cautions] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Enregistrer une caution
export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const caution = await prisma.caution.create({
      data: {
        clientId: corps.clientId,
        montant: parseFloat(corps.montant),
        type: corps.type,
        reference: corps.reference || null,
        statut: 'EN_ATTENTE',
        dateReception: corps.dateReception ? new Date(corps.dateReception) : new Date(),
        notes: corps.notes || null,
      },
      include: { client: { select: { id: true, nom: true, prenom: true } } },
    })

    return NextResponse.json({ succes: true, donnees: caution }, { status: 201 })
  } catch (erreur) {
    console.error('[API Cautions] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur création caution' }, { status: 400 })
  }
}

// PUT — Modifier le statut d'une caution
export async function PUT(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const data: Record<string, unknown> = { statut: corps.statut }
    if (corps.statut === 'RESTITUEE') data.dateRestitution = new Date()
    if (corps.statut === 'ENCAISSEE') data.dateRestitution = new Date()
    if (corps.notes) data.notes = corps.notes

    const caution = await prisma.caution.update({
      where: { id: corps.id },
      data,
      include: { client: { select: { id: true, nom: true, prenom: true } } },
    })

    return NextResponse.json({ succes: true, donnees: caution })
  } catch (erreur) {
    console.error('[API Cautions] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}
