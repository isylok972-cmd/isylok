import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const devisExistant = await prisma.devis.findUnique({
      where: { id },
      include: { client: true }
    })

    if (!devisExistant) {
      return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
    }

    // 1. Approuver le client
    await prisma.client.update({
      where: { id: devisExistant.clientId },
      data: { statutApprobation: 'VALIDE' }
    })

    // 2. Basculer le devis en INTERNE
    const devisMisAJour = await prisma.devis.update({
      where: { id },
      data: { source: 'INTERNE' },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            type: true,
            email: true,
            telephone: true,
            statutApprobation: true
          }
        },
        lignes: true
      }
    })

    return NextResponse.json({
      succes: true,
      message: 'Prospect approuvé et devis basculé en interne avec succès !',
      donnees: devisMisAJour
    })
  } catch (err: any) {
    console.error('[API Devis Approuver] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
