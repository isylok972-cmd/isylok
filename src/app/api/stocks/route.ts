// API CRUD pour les articles (stocks)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Récupérer tous les articles avec filtres
export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const type = params.get('type') // GROS_MATERIEL | PETIT_MATERIEL
    const categorieId = params.get('categorieId')
    const statut = params.get('statut')
    const recherche = params.get('recherche')

    const filtres: Record<string, unknown> = {}
    if (type) filtres.type = type
    if (categorieId) filtres.categorieId = categorieId
    if (statut) filtres.statut = statut
    if (recherche) {
      filtres.OR = [
        { nom: { contains: recherche } },
        { reference: { contains: recherche } },
        { description: { contains: recherche } },
      ]
    }

    const articles = await prisma.article.findMany({
      where: filtres,
      include: {
        categorie: true,
        grosEquipements: {
          include: { maintenances: { where: { statut: 'EN_COURS' } } },
        },
      },
      orderBy: { nom: 'asc' },
    })

    const roleCookie = requete.cookies.get('isylok_role')?.value
    const estOperateurAtelier = roleCookie === 'OPERATEUR_ATELIER'

    const donnees = estOperateurAtelier
      ? articles.map(a => ({
          ...a,
          prixLocationJour: 0,
          prixVente: null,
          grosEquipements: a.grosEquipements.map(g => ({ ...g, valeurAchat: null }))
        }))
      : articles

    return NextResponse.json({ succes: true, donnees })
  } catch (erreur) {
    console.error('[API Stocks] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la récupération des articles' }, { status: 500 })
  }
}

// POST — Créer un article
export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { reference, nom, description, categorieId, type, prixLocationJour, prixVente, quantiteTotale, seuilAlerte } = corps

    const article = await prisma.article.create({
      data: {
        reference,
        nom,
        description: description || null,
        categorieId,
        type,
        prixLocationJour: parseFloat(prixLocationJour) || 0,
        prixVente: prixVente ? parseFloat(prixVente) : null,
        quantiteTotale: parseInt(quantiteTotale) || 0,
        quantiteDisponible: parseInt(quantiteTotale) || 0,
        seuilAlerte: parseInt(seuilAlerte) || 5,
      },
      include: { categorie: true, grosEquipements: true },
    })

    return NextResponse.json({ succes: true, donnees: article }, { status: 201 })
  } catch (erreur: unknown) {
    console.error('[API Stocks] Erreur POST:', erreur)
    const message = erreur instanceof Error && erreur.message.includes('Unique')
      ? 'Cette référence existe déjà'
      : 'Erreur lors de la création de l\'article'
    return NextResponse.json({ succes: false, message }, { status: 400 })
  }
}
