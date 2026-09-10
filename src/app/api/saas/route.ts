import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const role = requete.cookies.get('isylok_role')?.value
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ succes: false, message: 'Accès réservé au Super Admin' }, { status: 403 })
    }

    let licence = await prisma.licenceSaaS.findFirst({
      orderBy: { dateCreation: 'desc' }
    })

    if (!licence) {
      const expirationDefaut = new Date()
      expirationDefaut.setFullYear(expirationDefaut.getFullYear() + 1)
      licence = await prisma.licenceSaaS.create({
        data: {
          cleLicence: 'ISYLOK-PRO-972',
          nomEntreprise: 'Isy Lok Martinique',
          statutActif: true,
          dateExpirationGlobale: expirationDefaut,
          modulesConfig: {
            stocks: true,
            commercial: true,
            planning: true,
            atelier: true,
            terrain: true,
            achats: true,
            rh: true,
            cautions: true,
            web: true,
            direction: true
          }
        }
      })
    }

    return NextResponse.json({ succes: true, donnees: licence })
  } catch (erreur) {
    console.error('[API SaaS GET]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const role = requete.cookies.get('isylok_role')?.value
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ succes: false, message: 'Accès réservé au Super Admin' }, { status: 403 })
    }

    const corps = await requete.json()
    const { statutActif, dateExpirationGlobale, modulesConfig, nomEntreprise, cleLicence } = corps

    let licence = await prisma.licenceSaaS.findFirst({
      orderBy: { dateCreation: 'desc' }
    })

    const dateParsed = dateExpirationGlobale ? new Date(dateExpirationGlobale) : null

    if (licence) {
      licence = await prisma.licenceSaaS.update({
        where: { id: licence.id },
        data: {
          statutActif: Boolean(statutActif),
          dateExpirationGlobale: dateParsed,
          modulesConfig: modulesConfig || {},
          nomEntreprise: nomEntreprise || licence.nomEntreprise,
          cleLicence: cleLicence || licence.cleLicence
        }
      })
    } else {
      licence = await prisma.licenceSaaS.create({
        data: {
          cleLicence: cleLicence || 'ISYLOK-PRO-972',
          nomEntreprise: nomEntreprise || 'Isy Lok Martinique',
          statutActif: Boolean(statutActif),
          dateExpirationGlobale: dateParsed,
          modulesConfig: modulesConfig || {}
        }
      })
    }

    return NextResponse.json({ succes: true, donnees: licence })
  } catch (erreur) {
    console.error('[API SaaS POST]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur mise à jour' }, { status: 500 })
  }
}
