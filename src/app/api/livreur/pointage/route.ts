import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    let utilisateurId: string | null = params.get('utilisateurId') || requete.cookies.get('isylok_user_id')?.value || null

    if (!utilisateurId) {
      // Trouver un utilisateur livreur ou admin par défaut
      const defaultUser = await prisma.utilisateur.findFirst({
        where: { role: { in: ['LIVREUR', 'ADMIN'] }, actif: true },
        select: { id: true }
      })
      utilisateurId = defaultUser?.id || null
    }

    if (!utilisateurId) {
      return NextResponse.json({
        succes: true,
        donnees: { pointageActif: null, historiqueAujourdhui: [] }
      })
    }

    // Début et fin de journée
    const aujourdhuiDebut = new Date()
    aujourdhuiDebut.setHours(0, 0, 0, 0)
    const aujourdhuiFin = new Date()
    aujourdhuiFin.setHours(23, 59, 59, 999)

    // Pointage en cours (sans heureFin)
    const pointageActif = await prisma.pointageLivreur.findFirst({
      where: {
        utilisateurId,
        heureFin: null,
      },
      orderBy: { heureDebut: 'desc' },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, role: true } }
      }
    })

    // Historique du jour
    const historiqueAujourdhui = await prisma.pointageLivreur.findMany({
      where: {
        utilisateurId,
        date: { gte: aujourdhuiDebut, lte: aujourdhuiFin },
      },
      orderBy: { heureDebut: 'desc' },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, role: true } }
      }
    })

    return NextResponse.json({
      succes: true,
      donnees: {
        pointageActif,
        historiqueAujourdhui,
        utilisateurId,
      }
    })
  } catch (erreur) {
    console.error('[API Livreur Pointage] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur récupération pointage' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { action, gps, notes } = corps
    let { utilisateurId } = corps

    if (!utilisateurId) {
      utilisateurId = requete.cookies.get('isylok_user_id')?.value
    }

    if (!utilisateurId) {
      const defaultUser = await prisma.utilisateur.findFirst({
        where: { role: { in: ['LIVREUR', 'ADMIN'] }, actif: true },
        select: { id: true }
      })
      utilisateurId = defaultUser?.id
    }

    if (!utilisateurId) {
      return NextResponse.json({ succes: false, message: 'Utilisateur non identifié' }, { status: 400 })
    }

    const maintenant = new Date()

    if (action === 'DEBUT') {
      // Vérifier s'il y a déjà un pointage actif non clôturé
      const existantActif = await prisma.pointageLivreur.findFirst({
        where: { utilisateurId, heureFin: null }
      })

      if (existantActif) {
        return NextResponse.json({
          succes: true,
          message: 'Une prise de poste est déjà active.',
          donnees: existantActif,
        })
      }

      const nouveauPointage = await prisma.pointageLivreur.create({
        data: {
          utilisateurId,
          date: maintenant,
          heureDebut: maintenant,
          gpsDebut: gps || null,
          notes: notes || null,
        },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } }
        }
      })

      // Inscription miroir dans la table Pointage RH pour compatibilité
      try {
        let lat: number | null = null
        let lng: number | null = null
        if (gps && gps.includes(',')) {
          const parts = gps.split(',')
          lat = parseFloat(parts[0]) || null
          lng = parseFloat(parts[1]) || null
        }
        await prisma.pointage.create({
          data: {
            utilisateurId,
            type: 'DEBUT',
            horodatage: maintenant,
            latitudeGps: lat,
            longitudeGps: lng,
            note: notes || 'Prise de poste mobile livreur'
          }
        })
      } catch (errRh) {
        console.warn('Erreur synchro RH pointage:', errRh)
      }

      return NextResponse.json({
        succes: true,
        message: 'Prise de poste enregistrée avec succès.',
        donnees: nouveauPointage
      }, { status: 201 })
    }

    if (action === 'FIN') {
      // Trouver le pointage actif
      const pointageActif = await prisma.pointageLivreur.findFirst({
        where: { utilisateurId, heureFin: null },
        orderBy: { heureDebut: 'desc' }
      })

      if (!pointageActif) {
        return NextResponse.json({
          succes: false,
          message: "Aucune prise de poste en cours à clôturer. Commencez par 'Prise de poste'."
        }, { status: 400 })
      }

      // Calculer le total en heures décimales (ex: 7.25h)
      const dureeMs = maintenant.getTime() - new Date(pointageActif.heureDebut).getTime()
      const totalHeures = Math.round((dureeMs / (1000 * 60 * 60)) * 100) / 100

      const pointageMisAJour = await prisma.pointageLivreur.update({
        where: { id: pointageActif.id },
        data: {
          heureFin: maintenant,
          gpsFin: gps || null,
          totalHeures,
          notes: notes ? (pointageActif.notes ? `${pointageActif.notes} | ${notes}` : notes) : pointageActif.notes
        },
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true } }
        }
      })

      // Inscription miroir RH
      try {
        let lat: number | null = null
        let lng: number | null = null
        if (gps && gps.includes(',')) {
          const parts = gps.split(',')
          lat = parseFloat(parts[0]) || null
          lng = parseFloat(parts[1]) || null
        }
        await prisma.pointage.create({
          data: {
            utilisateurId,
            type: 'FIN',
            horodatage: maintenant,
            latitudeGps: lat,
            longitudeGps: lng,
            note: notes || `Fin de service mobile (${totalHeures}h)`
          }
        })
      } catch (errRh) {
        console.warn('Erreur synchro RH pointage fin:', errRh)
      }

      return NextResponse.json({
        succes: true,
        message: `Fin de journée enregistrée (${totalHeures}h effectuées).`,
        donnees: pointageMisAJour
      })
    }

    return NextResponse.json({ succes: false, message: 'Action invalide (DEBUT ou FIN requis)' }, { status: 400 })
  } catch (erreur) {
    console.error('[API Livreur Pointage] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors du pointage' }, { status: 500 })
  }
}
