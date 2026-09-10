// API de synchronisation des actions hors-ligne
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { entite, entiteId, action, donnees, horodatage } = corps

    // Enregistrer l'action de synchronisation dans la base
    await prisma.fileSynchronisation.create({
      data: {
        entite,
        entiteId,
        action,
        donnees: JSON.stringify(donnees),
        statut: 'SYNCHRONISE',
        horodatage: new Date(horodatage),
        dateSynchro: new Date(),
      },
    })

    // TODO: Appliquer l'action sur l'entité correspondante
    // selon le type d'action (CREATION, MODIFICATION, SUPPRESSION)

    return NextResponse.json({
      succes: true,
      message: 'Action synchronisée avec succès',
    })
  } catch (erreur) {
    console.error('[Synchro API] Erreur:', erreur)
    return NextResponse.json(
      { succes: false, message: 'Erreur lors de la synchronisation' },
      { status: 500 }
    )
  }
}
