// API pour modifier le statut/état d'un équipement et créer des maintenances
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT — Modifier un équipement
export async function PUT(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const corps = await requete.json()

    const equipement = await prisma.grosEquipement.update({
      where: { id },
      data: {
        statut: corps.statut,
        etat: corps.etat,
        localisation: corps.localisation,
        notes: corps.notes,
      },
      include: { article: true, maintenances: true },
    })

    return NextResponse.json({ succes: true, donnees: equipement })
  } catch (erreur) {
    console.error('[API Équipement] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}
