import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'

export async function GET() {
  try {
    const lots = await prisma.lotLavage.findMany({
      include: {
        article: {
          select: {
            id: true,
            nom: true,
            reference: true,
            quantiteDisponible: true,
            quantiteTotale: true,
            categorie: { select: { nom: true, icone: true } }
          }
        }
      },
      orderBy: { dateCreation: 'desc' }
    })

    const aLaver = lots.filter(l => l.statut === 'A_LAVER')
    const enCours = lots.filter(l => l.statut === 'EN_COURS')
    const propre = lots.filter(l => l.statut === 'PROPRE')

    return NextResponse.json({
      succes: true,
      donnees: {
        tous: lots,
        aLaver,
        enCours,
        propre,
        stats: {
          totalALaver: aLaver.reduce((acc, l) => acc + l.quantite, 0),
          totalEnCours: enCours.reduce((acc, l) => acc + l.quantite, 0),
          totalPropre: propre.reduce((acc, l) => acc + l.quantite, 0)
        }
      }
    })
  } catch (erreur) {
    console.error('[API Atelier Lavage GET]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { articleId, quantite, type, evenementOrigine, notes } = corps

    if (!articleId || !quantite) {
      return NextResponse.json({ succes: false, message: 'Article et quantité requis' }, { status: 400 })
    }

    const qteNum = parseInt(quantite, 10) || 1
    const annee = new Date().getFullYear()
    const count = await prisma.lotLavage.count()
    const numero = genererNumero('LOT', annee, count + 1)

    const article = await prisma.article.findUnique({ where: { id: articleId } })
    if (!article) {
      return NextResponse.json({ succes: false, message: 'Article introuvable' }, { status: 404 })
    }

    let typeLot = type
    if (!typeLot) {
      typeLot = article.nom.toLowerCase().includes('nappe') || article.nom.toLowerCase().includes('serviette')
        ? 'TEXTILE'
        : 'VAISSELLE'
    }

    const nouveauLot = await prisma.lotLavage.create({
      data: {
        numero,
        articleId,
        quantite: qteNum,
        statut: 'A_LAVER',
        type: typeLot,
        evenementOrigine: evenementOrigine || null,
        notes: notes || null,
        reintegreStock: false
      },
      include: {
        article: true
      }
    })

    return NextResponse.json({ succes: true, donnees: nouveauLot }, { status: 201 })
  } catch (erreur) {
    console.error('[API Atelier Lavage POST]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la création du lot' }, { status: 500 })
  }
}

export async function PUT(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { lotId, nouveauStatut } = corps

    if (!lotId || !nouveauStatut) {
      return NextResponse.json({ succes: false, message: 'lotId et nouveauStatut requis' }, { status: 400 })
    }

    const lot = await prisma.lotLavage.findUnique({
      where: { id: lotId },
      include: { article: true }
    })

    if (!lot) {
      return NextResponse.json({ succes: false, message: 'Lot introuvable' }, { status: 404 })
    }

    // Réintégration automatique dans le stock disponible uniquement quand le statut passe à "PROPRE"
    let reint = lot.reintegreStock
    let dateClot = lot.dateCloture

    if (nouveauStatut === 'PROPRE' && !lot.reintegreStock) {
      // On incrémente le stock disponible
      await prisma.article.update({
        where: { id: lot.articleId },
        data: {
          quantiteDisponible: {
            increment: lot.quantite
          }
        }
      })
      reint = true
      dateClot = new Date()
    }

    const lotMisAJour = await prisma.lotLavage.update({
      where: { id: lotId },
      data: {
        statut: nouveauStatut,
        reintegreStock: reint,
        dateCloture: dateClot
      },
      include: { article: true }
    })

    return NextResponse.json({
      succes: true,
      message: nouveauStatut === 'PROPRE'
        ? `Lot validé propre ! +${lot.quantite} pièces réintégrées dans le stock disponible.`
        : `Statut du lot mis à jour : ${nouveauStatut}`,
      donnees: lotMisAJour
    })
  } catch (erreur) {
    console.error('[API Atelier Lavage PUT]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la mise à jour du lot' }, { status: 500 })
  }
}
