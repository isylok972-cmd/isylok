import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const caution = await prisma.caution.findUnique({
      where: { id },
      include: {
        client: true,
        devis: {
          include: {
            lignes: true
          }
        },
        declarationsCasse: {
          include: {
            article: true
          }
        }
      }
    })

    if (!caution) {
      return NextResponse.json({ succes: false, message: 'Caution introuvable' }, { status: 404 })
    }

    // Récupérer également les casses du même devis non associées
    let casses = caution.declarationsCasse
    if (caution.devisId) {
      const cassesSupp = await prisma.declarationCasse.findMany({
        where: {
          devisId: caution.devisId,
          cautionId: null
        },
        include: {
          article: true
        }
      })
      casses = [...casses, ...cassesSupp]
    }

    return NextResponse.json({
      succes: true,
      donnees: {
        ...caution,
        declarationsCasse: casses
      }
    })
  } catch (erreur) {
    console.error('[API Caution GET ID] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const cautionExistante = await prisma.caution.findUnique({ where: { id } })
    if (!cautionExistante) {
      return NextResponse.json({ succes: false, message: 'Caution introuvable' }, { status: 404 })
    }

    const {
      statut,
      montant,
      type,
      reference,
      dateDepot,
      dateRestitution,
      montantRetenu,
      montantRestitue,
      motifRetenue,
      notes
    } = corps

    const montantInitial = montant !== undefined ? parseFloat(montant) : cautionExistante.montant
    const retenue = montantRetenu !== undefined ? parseFloat(montantRetenu) : cautionExistante.montantRetenu
    const restitue = montantRestitue !== undefined
      ? parseFloat(montantRestitue)
      : Math.max(0, montantInitial - retenue)

    const dateRestitFinale = (statut === 'RESTITUE' || statut === 'ENCAISSE_PARTIEL' || statut === 'ENCAISSE_TOTAL')
      ? (dateRestitution ? new Date(dateRestitution) : (cautionExistante.dateRestitution || new Date()))
      : null

    const dateDepotFinale = dateDepot !== undefined
      ? (dateDepot ? new Date(dateDepot) : null)
      : (statut === 'RECU_NON_ENCAISSE' && !cautionExistante.dateDepot ? new Date() : cautionExistante.dateDepot)

    const cautionMAJ = await prisma.caution.update({
      where: { id },
      data: {
        statut: statut ?? cautionExistante.statut,
        montant: montantInitial,
        type: type ?? cautionExistante.type,
        reference: reference !== undefined ? reference : cautionExistante.reference,
        dateDepot: dateDepotFinale,
        dateReception: dateDepotFinale,
        dateRestitution: dateRestitFinale,
        montantRetenu: retenue,
        montantRestitue: (statut === 'RESTITUE' || statut === 'ENCAISSE_PARTIEL') ? restitue : (statut === 'ENCAISSE_TOTAL' ? 0 : null),
        motifRetenue: motifRetenue !== undefined ? motifRetenue : cautionExistante.motifRetenue,
        notes: notes !== undefined ? notes : cautionExistante.notes
      },
      include: {
        client: true,
        devis: true,
        declarationsCasse: {
          include: {
            article: true
          }
        }
      }
    })

    // Lier les déclarations de casse orphelines du devis à cette caution
    if (cautionMAJ.devisId) {
      await prisma.declarationCasse.updateMany({
        where: {
          devisId: cautionMAJ.devisId,
          cautionId: null
        },
        data: {
          cautionId: cautionMAJ.id
        }
      })
    }

    return NextResponse.json({
      succes: true,
      donnees: cautionMAJ,
      message: 'Caution mise à jour avec succès'
    })
  } catch (erreur) {
    console.error('[API Caution PUT ID] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la mise à jour de la caution' }, { status: 500 })
  }
}

export async function DELETE(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.caution.delete({ where: { id } })
    return NextResponse.json({ succes: true, message: 'Caution supprimée avec succès' })
  } catch (erreur) {
    console.error('[API Caution DELETE ID] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur suppression caution' }, { status: 500 })
  }
}
