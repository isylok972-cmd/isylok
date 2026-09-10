// API CRUD pour les clients
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Liste des clients avec filtres
export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const type = params.get('type')
    const recherche = params.get('recherche')
    const statutApprobation = params.get('statutApprobation')

    const filtres: Record<string, unknown> = {}
    if (type) filtres.type = type
    if (statutApprobation) filtres.statutApprobation = statutApprobation
    if (recherche) {
      filtres.OR = [
        { nom: { contains: recherche } },
        { prenom: { contains: recherche } },
        { entreprise: { contains: recherche } },
        { email: { contains: recherche } },
        { telephone: { contains: recherche } },
        { ville: { contains: recherche } },
      ]
    }

    const clients = await prisma.client.findMany({
      where: filtres,
      include: {
        cautions: true,
        devis: { select: { id: true, numero: true, totalTtc: true, statut: true } },
      },
      orderBy: { dateCreation: 'desc' },
    })

    return NextResponse.json({ succes: true, donnees: clients })
  } catch (erreur) {
    console.error('[API Clients] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Créer un client
export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const client = await prisma.client.create({
      data: {
        type: corps.type || 'PARTICULIER',
        nom: corps.nom,
        prenom: corps.prenom || null,
        entreprise: corps.entreprise || null,
        siret: corps.siret || null,
        email: corps.email || null,
        telephone: corps.telephone,
        telephoneSecondaire: corps.telephoneSecondaire || null,
        adresse: corps.adresse || null,
        codePostal: corps.codePostal || null,
        ville: corps.ville || null,
        grillesTarifaires: corps.profilTarifaire || null,
        notes: corps.notes || null,
      },
      include: { cautions: true },
    })

    return NextResponse.json({ succes: true, donnees: client }, { status: 201 })
  } catch (erreur) {
    console.error('[API Clients] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la création' }, { status: 400 })
  }
}
