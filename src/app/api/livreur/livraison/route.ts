import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const dateStr = params.get('date')
    const livreurId = params.get('livreurId') || requete.cookies.get('isylok_user_id')?.value

    const debut = dateStr ? new Date(dateStr) : new Date()
    debut.setHours(0, 0, 0, 0)
    const fin = dateStr ? new Date(dateStr) : new Date()
    fin.setHours(23, 59, 59, 999)

    // 1. Récupérer les tournées du jour
    const tournees = await prisma.tournee.findMany({
      where: {
        date: { gte: debut, lte: fin },
        ...(livreurId ? { livreurId } : {}),
      },
      include: {
        livreur: { select: { id: true, nom: true, prenom: true } },
        etapes: {
          include: {
            devis: {
              include: {
                client: true,
                lignes: { include: { article: true } },
              },
            },
            signatures: true,
            photos: true,
            cassesSignalees: true,
          },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { date: 'asc' },
    })

    // 2. Si aucune tournée avec étapes n'est trouvée pour ce livreur ou aujourd'hui,
    // récupérer les devis validés du jour ou récents pour permettre la livraison directe
    let devisDuJour = null
    if (tournees.length === 0 || (tournees[0] && tournees[0].etapes.length === 0)) {
      devisDuJour = await prisma.devis.findMany({
        where: {
          statut: { in: ['VALIDE', 'FACTURE'] },
          dateEvenement: { gte: debut, lte: fin },
        },
        include: {
          client: true,
          lignes: { include: { article: true } },
        },
        orderBy: { dateEvenement: 'asc' },
      })
    }

    return NextResponse.json({
      succes: true,
      donnees: {
        tournees,
        tourneePrincipale: tournees[0] || null,
        devisDuJour: devisDuJour || [],
      },
    })
  } catch (erreur) {
    console.error('[API Livreur Livraison] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur récupération feuille de route' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { action, devisId, etapeId, signatureBase64, signataireNom, gps, anomalies, nouveauStatut } = corps

    if (!action) {
      return NextResponse.json({ succes: false, message: 'Action requise' }, { status: 400 })
    }

    const maintenant = new Date()

    // 1. Validation de la dépose / émargement signature client
    if (action === 'SIGNATURE') {
      if (!devisId && !etapeId) {
        return NextResponse.json({ succes: false, message: 'devisId ou etapeId requis' }, { status: 400 })
      }

      let idDevisCible = devisId

      // Si etapeId est fourni, récupérer le devis associé et mettre à jour l'étape
      if (etapeId) {
        const etape = await prisma.etape.findUnique({
          where: { id: etapeId },
          select: { id: true, devisId: true },
        })

        if (etape) {
          idDevisCible = idDevisCible || etape.devisId

          // Optionnel: statut étape terminée
          await prisma.etape.update({
            where: { id: etapeId },
            data: { statut: 'TERMINEE', heureArrivee: maintenant },
          })

          // Enregistrer dans SignatureElectronique si signature transmise
          if (signatureBase64) {
            let lat: number | null = null
            let lng: number | null = null
            if (gps && gps.includes(',')) {
              const parts = gps.split(',')
              lat = parseFloat(parts[0]) || null
              lng = parseFloat(parts[1]) || null
            }

            await prisma.signatureElectronique.create({
              data: {
                etapeId,
                signataire: signataireNom || 'Client Réceptionnaire',
                role: 'CLIENT',
                imageUrl: signatureBase64,
                horodatage: maintenant,
                latitudeGps: lat,
                longitudeGps: lng,
              },
            })
          }
        }
      }

      // Mettre à jour le devis avec l'émargement tactile
      if (idDevisCible) {
        await prisma.devis.update({
          where: { id: idDevisCible },
          data: {
            signatureLivraison: signatureBase64 || null,
            dateSignatureLivraison: maintenant,
            gpsLivraison: gps || null,
          },
        })
      }

      return NextResponse.json({
        succes: true,
        message: 'Émargement et bon de livraison validés avec succès.',
      })
    }

    // 2. Déclaration de reprise / casses / manquants / photos anomalies
    if (action === 'REPRISE') {
      if (!devisId && !etapeId) {
        return NextResponse.json({ succes: false, message: 'devisId ou etapeId requis' }, { status: 400 })
      }

      let idDevisCible = devisId

      if (etapeId) {
        const etape = await prisma.etape.findUnique({
          where: { id: etapeId },
          select: { id: true, devisId: true },
        })
        if (etape) {
          idDevisCible = idDevisCible || etape.devisId

          await prisma.etape.update({
            where: { id: etapeId },
            data: { statut: 'TERMINEE', heureArrivee: maintenant },
          })

          // Si anomalies transmises, créer les entrées CasseSignalee
          if (Array.isArray(anomalies)) {
            for (const item of anomalies) {
              if (item.articleNom || item.description) {
                await prisma.casseSignalee.create({
                  data: {
                    etapeId,
                    articleNom: item.articleNom || 'Article non précisé',
                    quantite: Number(item.quantite) || 1,
                    description: item.description || 'Constat retour matériel',
                    photoUrl: item.photoUrl || '',
                    montantEstime: item.montantEstime ? parseFloat(item.montantEstime) : null,
                  },
                })
              }
            }
          }
        }
      }

      // Sauvegarde dans devis.photosAnomalies (JSON stringifié)
      if (idDevisCible && anomalies) {
        const payloadJson = typeof anomalies === 'string' ? anomalies : JSON.stringify(anomalies)
        await prisma.devis.update({
          where: { id: idDevisCible },
          data: {
            photosAnomalies: payloadJson,
          },
        })
      }

      return NextResponse.json({
        succes: true,
        message: 'Constat de reprise et anomalies enregistrés.',
      })
    }

    // 3. Mise à jour de statut d'étape purement optionnelle
    if (action === 'STATUT_ETAPE') {
      if (!etapeId || !nouveauStatut) {
        return NextResponse.json({ succes: false, message: 'etapeId et nouveauStatut requis' }, { status: 400 })
      }

      const etape = await prisma.etape.update({
        where: { id: etapeId },
        data: {
          statut: nouveauStatut,
          ...(nouveauStatut === 'SUR_PLACE' ? { heureArrivee: maintenant } : {}),
        },
      })

      return NextResponse.json({
        succes: true,
        message: `Statut d'étape mis à jour (${nouveauStatut}).`,
        donnees: etape,
      })
    }

    return NextResponse.json({ succes: false, message: 'Action inconnue' }, { status: 400 })
  } catch (erreur) {
    console.error('[API Livreur Livraison] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: "Erreur lors de l'enregistrement de livraison" }, { status: 500 })
  }
}
