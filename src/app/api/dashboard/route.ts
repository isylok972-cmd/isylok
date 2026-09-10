import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const q = params.get('q')

    // Si on fait une recherche
    if (q && q.length > 1) {
      const [clients, articles, devis] = await Promise.all([
        prisma.client.findMany({
          where: {
            OR: [
              { nom: { contains: q } },
              { entreprise: { contains: q } }
            ]
          },
          take: 5
        }),
        prisma.article.findMany({
          where: { nom: { contains: q } },
          take: 5
        }),
        prisma.devis.findMany({
          where: { numero: { contains: q } },
          take: 5,
          include: { client: true }
        })
      ])
      
      return NextResponse.json({ succes: true, donnees: { clients, articles, devis } })
    }

    // Sinon, on renvoie juste les badges (les counts)
    const today = new Date()
    today.setHours(0,0,0,0)

    const [alertesStock, devisEnAttente, pointagesActifs, lotsALaver] = await Promise.all([
      prisma.article.count({
        where: {
          quantiteDisponible: { lte: prisma.article.fields.seuilAlerte }
        }
      }),
      prisma.devis.count({
        where: { statut: 'ENVOYE' }
      }),
      // Pour les pointages "en cours", on regarde si le dernier pointage du jour est "DEBUT" pour chaque user
      // Simplification : on compte les DEBUT du jour moins les FIN du jour. (Peut être inexact si multi-shift, mais ok pour indicateur)
      prisma.pointage.findMany({
        where: { horodatage: { gte: today } }
      }).then(pts => {
        let count = 0
        const users = new Set(pts.map(p => p.utilisateurId))
        users.forEach(u => {
          const userPts = pts.filter(p => p.utilisateurId === u).sort((a, b) => b.horodatage.getTime() - a.horodatage.getTime())
          if (userPts[0]?.type === 'DEBUT') count++
        })
        return count
      }),
      prisma.lotLavage.count({ where: { statut: 'A_LAVER' } }).catch(() => 0)
    ])

    return NextResponse.json({
      succes: true,
      donnees: {
        badges: {
          stocks: alertesStock,
          commercial: devisEnAttente,
          rh: pointagesActifs,
          atelier: lotsALaver
        }
      }
    })

  } catch (erreur) {
    console.error('[API Dashboard] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
