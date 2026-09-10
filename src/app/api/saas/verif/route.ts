import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const licence = await prisma.licenceSaaS.findFirst({
      orderBy: { dateCreation: 'desc' }
    })

    if (!licence) {
      return NextResponse.json({
        succes: true,
        statutActif: true,
        estExpire: false,
        dateExpirationGlobale: null,
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
      })
    }

    const maintenant = new Date()
    const estExpire = licence.dateExpirationGlobale ? new Date(licence.dateExpirationGlobale) < maintenant : false
    const estActif = licence.statutActif && !estExpire

    return NextResponse.json({
      succes: true,
      cleLicence: licence.cleLicence,
      nomEntreprise: licence.nomEntreprise,
      statutActif: licence.statutActif,
      dateExpirationGlobale: licence.dateExpirationGlobale,
      estExpire,
      estActif,
      modulesConfig: licence.modulesConfig || {
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
    })
  } catch (erreur) {
    console.error('[API SaaS Verif]', erreur)
    // Fail-open par défaut pour éviter de bloquer l'application en cas d'erreur ponctuelle
    return NextResponse.json({
      succes: true,
      statutActif: true,
      estExpire: false,
      modulesConfig: {}
    })
  }
}
