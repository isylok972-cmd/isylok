// API pour les opérations de maintenance
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST — Créer une maintenance
export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const maintenance = await prisma.maintenance.create({
      data: {
        grosEquipementId: corps.grosEquipementId,
        type: corps.type,
        description: corps.description,
        cout: corps.cout ? parseFloat(corps.cout) : null,
        prestataire: corps.prestataire || null,
      },
    })

    // Mettre à jour le statut de l'équipement
    const nouveauStatut = corps.type === 'NETTOYAGE' ? 'EN_NETTOYAGE' : 'EN_REPARATION'
    await prisma.grosEquipement.update({
      where: { id: corps.grosEquipementId },
      data: { statut: nouveauStatut },
    })

    return NextResponse.json({ succes: true, donnees: maintenance }, { status: 201 })
  } catch (erreur) {
    console.error('[API Maintenance] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — Terminer une maintenance
export async function PUT(requete: NextRequest) {
  try {
    const corps = await requete.json()

    const maintenance = await prisma.maintenance.update({
      where: { id: corps.id },
      data: { statut: 'TERMINEE', dateFin: new Date(), cout: corps.cout ? parseFloat(corps.cout) : undefined },
    })

    // Remettre l'équipement en disponible
    await prisma.grosEquipement.update({
      where: { id: maintenance.grosEquipementId },
      data: { statut: 'DISPONIBLE' },
    })

    return NextResponse.json({ succes: true, donnees: maintenance })
  } catch (erreur) {
    console.error('[API Maintenance] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
