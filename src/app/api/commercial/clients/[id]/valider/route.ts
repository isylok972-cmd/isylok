import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const clientExistant = await prisma.client.findUnique({
      where: { id }
    })

    if (!clientExistant) {
      return NextResponse.json({ succes: false, message: 'Client introuvable' }, { status: 404 })
    }

    // Valider le prospect
    const clientMaj = await prisma.client.update({
      where: { id },
      data: { statutApprobation: 'VALIDE' }
    })

    // Basculer également ses devis web en interne
    await prisma.devis.updateMany({
      where: { clientId: id, source: 'WEB' },
      data: { source: 'INTERNE' }
    })

    return NextResponse.json({
      succes: true,
      message: 'Prospect validé et transféré dans les clients officiels avec succès !',
      donnees: clientMaj
    })
  } catch (err: any) {
    console.error('[API Valider Prospect] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx)
}
