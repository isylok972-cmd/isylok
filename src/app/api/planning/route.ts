import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const categorieFiltre = params.get('categorie')
    const statutFiltre = params.get('statut')
    const recherche = params.get('q')?.toLowerCase()

    // 1. Récupérer les devis avec date d'événement
    const devis = await prisma.devis.findMany({
      where: {
        dateEvenement: { not: null },
        statut: statutFiltre ? statutFiltre : { in: ['VALIDE', 'FACTURE', 'ENVOYE', 'BROUILLON'] }
      },
      include: {
        client: true,
        lignes: {
          include: {
            article: {
              include: {
                categorie: true
              }
            }
          }
        }
      },
      orderBy: { dateEvenement: 'asc' }
    })

    // 2. Récupérer tous les articles pour connaître la capacité totale du parc
    const articles = await prisma.article.findMany({
      include: {
        categorie: true
      }
    })

    const articlesMap = new Map<string, typeof articles[0]>()
    articles.forEach(a => articlesMap.set(a.id, a))

    // 3. Calcul de la charge quotidienne par article pour détecter les tensions et overbookings
    // Clé: `articleId_YYYY-MM-DD` -> Quantité cumulée réservée
    const chargeQuotidienne = new Map<string, number>()

    devis.forEach(d => {
      if (!d.dateEvenement) return
      // Événements confirmés ou en option
      const dateDebut = new Date(d.dateEvenement)
      const duree = Math.max(1, d.dureeLocation || 1)
      
      for (let j = 0; j < duree; j++) {
        const jour = new Date(dateDebut)
        jour.setDate(jour.getDate() + j)
        const cleJour = jour.toISOString().slice(0, 10)

        d.lignes.forEach(ligne => {
          if (!ligne.articleId) return
          const cle = `${ligne.articleId}_${cleJour}`
          const chargeActuelle = chargeQuotidienne.get(cle) || 0
          chargeQuotidienne.set(cle, chargeActuelle + ligne.quantite)
        })
      }
    })

    // 4. Enrichir chaque événement avec le diagnostic de tension
    const evenementsFormates = devis.map(d => {
      const dateDebut = new Date(d.dateEvenement!)
      const duree = Math.max(1, d.dureeLocation || 1)
      const dateFin = new Date(dateDebut)
      dateFin.setDate(dateFin.getDate() + duree)

      let niveauTensionMax: 'NORMAL' | 'CRITIQUE' | 'SURRESERVATION' = 'NORMAL'
      const articlesEnTension: Array<{
        articleId: string
        nom: string
        reference: string
        quantiteDemandee: number
        quantiteTotaleParc: number
        chargeMaxJour: number
        pourcentageCharge: number
        etat: 'CRITIQUE' | 'SURRESERVATION'
      }> = []

      const categoriesDuDevis = new Set<string>()

      for (const ligne of d.lignes) {
        if (ligne.article?.categorie?.nom) {
          categoriesDuDevis.add(ligne.article.categorie.nom)
        }

        if (!ligne.articleId) continue
        const art = articlesMap.get(ligne.articleId)
        if (!art || art.quantiteTotale <= 0) continue

        let chargeMaxSurPeriode = 0
        for (let j = 0; j < duree; j++) {
          const jour = new Date(dateDebut)
          jour.setDate(jour.getDate() + j)
          const cleJour = jour.toISOString().slice(0, 10)
          const charge = chargeQuotidienne.get(`${ligne.articleId}_${cleJour}`) || 0
          if (charge > chargeMaxSurPeriode) {
            chargeMaxSurPeriode = charge
          }
        }

        const ratio = chargeMaxSurPeriode / art.quantiteTotale
        if (ratio > 1) {
          niveauTensionMax = 'SURRESERVATION'
          articlesEnTension.push({
            articleId: art.id,
            nom: art.nom,
            reference: art.reference,
            quantiteDemandee: ligne.quantite,
            quantiteTotaleParc: art.quantiteTotale,
            chargeMaxJour: chargeMaxSurPeriode,
            pourcentageCharge: Math.round(ratio * 100),
            etat: 'SURRESERVATION'
          })
        } else if (ratio >= 0.75) {
          if (niveauTensionMax !== 'SURRESERVATION') {
            niveauTensionMax = 'CRITIQUE'
          }
          articlesEnTension.push({
            articleId: art.id,
            nom: art.nom,
            reference: art.reference,
            quantiteDemandee: ligne.quantite,
            quantiteTotaleParc: art.quantiteTotale,
            chargeMaxJour: chargeMaxSurPeriode,
            pourcentageCharge: Math.round(ratio * 100),
            etat: 'CRITIQUE'
          })
        }
      }

      return {
        id: d.id,
        numero: d.numero,
        dateEvenement: d.dateEvenement,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        dureeLocation: duree,
        lieuEvenement: d.lieuEvenement || 'Lieu non spécifié',
        typeEvenement: d.typeEvenement || 'Événement',
        statut: d.statut,
        totalTtc: d.totalTtc,
        tauxTva: d.tauxTva,
        client: {
          id: d.client.id,
          nom: d.client.nom,
          prenom: d.client.prenom,
          entreprise: d.client.entreprise,
          telephone: d.client.telephone,
          email: d.client.email,
          ville: d.client.ville
        },
        lignes: d.lignes.map(l => ({
          id: l.id,
          articleId: l.articleId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          totalLigne: l.totalLigne,
          article: l.article
            ? {
                id: l.article.id,
                nom: l.article.nom,
                reference: l.article.reference,
                quantiteTotale: l.article.quantiteTotale,
                quantiteDisponible: l.article.quantiteDisponible,
                categorie: l.article.categorie
                  ? {
                      id: l.article.categorie.id,
                      nom: l.article.categorie.nom,
                      type: l.article.categorie.type,
                      icone: l.article.categorie.icone
                    }
                  : null
              }
            : null
        })),
        categories: Array.from(categoriesDuDevis),
        tension: niveauTensionMax,
        articlesEnTension
      }
    })

    // 5. Filtrage optionnel
    const evenementsFiltres = evenementsFormates.filter(ev => {
      if (categorieFiltre && !ev.categories.includes(categorieFiltre)) {
        return false
      }
      if (recherche) {
        const texte = `${ev.numero} ${ev.client.nom} ${ev.client.prenom || ''} ${ev.client.entreprise || ''} ${ev.lieuEvenement} ${ev.typeEvenement}`.toLowerCase()
        if (!texte.includes(recherche)) return false
      }
      return true
    })

    // 6. Catégories uniques
    const categoriesToutes = await prisma.categorie.findMany({
      orderBy: { nom: 'asc' }
    })

    // 7. Statistiques globales
    const stats = {
      totalEvenements: evenementsFormates.length,
      evenementsNormaux: evenementsFormates.filter(e => e.tension === 'NORMAL').length,
      evenementsCritiques: evenementsFormates.filter(e => e.tension === 'CRITIQUE').length,
      evenementsSurreservation: evenementsFormates.filter(e => e.tension === 'SURRESERVATION').length
    }

    return NextResponse.json({
      succes: true,
      donnees: {
        evenements: evenementsFiltres,
        categories: categoriesToutes,
        stats
      }
    })
  } catch (erreur) {
    console.error('[API Planning] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors du chargement du planning' }, { status: 500 })
  }
}
