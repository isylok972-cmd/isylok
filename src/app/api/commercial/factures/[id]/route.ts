import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        devis: {
          include: { lignes: { include: { article: true } } }
        }
      },
    })
    if (!facture) return NextResponse.json({ succes: false, message: 'Facture introuvable' }, { status: 404 })
    return NextResponse.json({ succes: true, donnees: facture })
  } catch (erreur) {
    console.error('[API Facture] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const dataToUpdate: any = {}
    if (corps.statut) dataToUpdate.statut = corps.statut
    if (corps.statut === 'PAYEE') {
      dataToUpdate.datePaiement = new Date()
      dataToUpdate.modePaiement = corps.modePaiement || 'VIREMENT'
      dataToUpdate.montantPaye = corps.montantPaye // Ou le total TTC
    }

    const facture = await prisma.facture.update({
      where: { id },
      data: dataToUpdate
    })

    return NextResponse.json({ succes: true, donnees: facture })
  } catch (erreur) {
    console.error('[API Facture] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}
