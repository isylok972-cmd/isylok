import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let parametres = await prisma.parametresEntreprise.findFirst()
    if (!parametres) {
      // Create defaults if none exist
      parametres = await prisma.parametresEntreprise.create({ data: {} })
    }
    return NextResponse.json({ succes: true, donnees: parametres })
  } catch (erreur) {
    console.error('[API Parametres] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(requete: NextRequest) {
  try {
    const corps = await requete.json()
    
    // Find the first record to update
    const parametresExistants = await prisma.parametresEntreprise.findFirst()
    
    let parametres;
    if (parametresExistants) {
      parametres = await prisma.parametresEntreprise.update({
        where: { id: parametresExistants.id },
        data: corps
      })
    } else {
      parametres = await prisma.parametresEntreprise.create({
        data: corps
      })
    }

    return NextResponse.json({ succes: true, donnees: parametres })
  } catch (erreur) {
    console.error('[API Parametres] Erreur PUT:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur mise à jour' }, { status: 500 })
  }
}
