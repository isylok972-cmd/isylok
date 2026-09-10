// API CRUD pour les catégories de matériel
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Récupérer toutes les catégories
export async function GET() {
  try {
    const categories = await prisma.categorie.findMany({
      include: { articles: { select: { id: true } } },
      orderBy: { nom: 'asc' },
    })

    // Ajouter le compteur d'articles
    const donnees = categories.map((cat) => ({
      ...cat,
      nombreArticles: cat.articles.length,
      articles: undefined,
    }))

    return NextResponse.json({ succes: true, donnees })
  } catch (erreur) {
    console.error('[API Catégories] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
