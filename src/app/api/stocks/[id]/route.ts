// API pour un article individuel + ses équipements
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Détail d'un article
export async function GET(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        categorie: true,
        grosEquipements: {
          include: { maintenances: { orderBy: { dateDebut: 'desc' } } },
        },
      },
    })

    if (!article) {
      return NextResponse.json({ succes: false, message: 'Article introuvable' }, { status: 404 })
    }

    return NextResponse.json({ succes: true, donnees: article })
  } catch (erreur) {
    console.error('[API Stocks] Erreur GET détail:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — Modifier un article
export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const article = await prisma.article.update({
      where: { id },
      data: {
        nom: corps.nom,
        description: corps.description,
        prixLocationJour: corps.prixLocationJour ? parseFloat(corps.prixLocationJour) : undefined,
        prixVente: corps.prixVente ? parseFloat(corps.prixVente) : undefined,
        quantiteTotale: corps.quantiteTotale ? parseInt(corps.quantiteTotale) : undefined,
        quantiteDisponible: corps.quantiteDisponible ? parseInt(corps.quantiteDisponible) : undefined,
        seuilAlerte: corps.seuilAlerte ? parseInt(corps.seuilAlerte) : undefined,
        statut: corps.statut,
      },
      include: { categorie: true, grosEquipements: true },
    })

    return NextResponse.json({ succes: true, donnees: article })
  } catch (erreur) {
    console.error('[API Stocks] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la modification' }, { status: 500 })
  }
}

// DELETE — Supprimer un article
export async function DELETE(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.article.delete({ where: { id } })
    return NextResponse.json({ succes: true, message: 'Article supprimé' })
  } catch (erreur) {
    console.error('[API Stocks] Erreur DELETE:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
