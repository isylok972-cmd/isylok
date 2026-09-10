// API CRUD pour les gros équipements (suivi unitaire par numéro de série)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Récupérer les équipements d'un article
export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const articleId = params.get('articleId')
    const statut = params.get('statut')

    const filtres: Record<string, unknown> = {}
    if (articleId) filtres.articleId = articleId
    if (statut) filtres.statut = statut

    const equipements = await prisma.grosEquipement.findMany({
      where: filtres,
      include: {
        article: { include: { categorie: true } },
        maintenances: { orderBy: { dateDebut: 'desc' }, take: 3 },
      },
      orderBy: { numeroSerie: 'asc' },
    })

    return NextResponse.json({ succes: true, donnees: equipements })
  } catch (erreur) {
    console.error('[API Équipements] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Créer un équipement
export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const equipement = await prisma.grosEquipement.create({
      data: {
        articleId: corps.articleId,
        numeroSerie: corps.numeroSerie,
        statut: corps.statut || 'DISPONIBLE',
        etat: corps.etat || 'BON',
        dateAchat: corps.dateAchat ? new Date(corps.dateAchat) : null,
        valeurAchat: corps.valeurAchat ? parseFloat(corps.valeurAchat) : null,
        localisation: corps.localisation || null,
        notes: corps.notes || null,
      },
      include: { article: true, maintenances: true },
    })

    return NextResponse.json({ succes: true, donnees: equipement }, { status: 201 })
  } catch (erreur: unknown) {
    console.error('[API Équipements] Erreur POST:', erreur)
    const message = erreur instanceof Error && erreur.message.includes('Unique')
      ? 'Ce numéro de série existe déjà'
      : 'Erreur lors de la création'
    return NextResponse.json({ succes: false, message }, { status: 400 })
  }
}
