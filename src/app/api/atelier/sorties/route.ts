import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const roleCookie = requete.cookies.get('isylok_role')?.value
    const estOperateurAtelier = roleCookie === 'OPERATEUR_ATELIER'

    // Récupère les devis ayant des articles du périmètre PETIT_MATERIEL
    const devisAvecPetitMateriel = await prisma.devis.findMany({
      where: {
        statut: { in: ['VALIDE', 'ENVOYE', 'BROUILLON'] },
        lignes: {
          some: {
            article: {
              type: 'PETIT_MATERIEL'
            }
          }
        }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            telephone: true,
            ville: true
          }
        },
        lignes: {
          where: {
            article: {
              type: 'PETIT_MATERIEL'
            }
          },
          include: {
            article: {
              select: {
                id: true,
                reference: true,
                nom: true,
                type: true,
                prixLocationJour: !estOperateurAtelier,
                categorie: { select: { nom: true, icone: true } }
              }
            }
          }
        }
      },
      orderBy: { dateEvenement: 'asc' }
    })

    // Récupérer les états de conditionnement existants pour ces devis
    const devisIds = devisAvecPetitMateriel.map(d => d.id)
    const conditionnements = await prisma.conditionnementAtelier.findMany({
      where: { devisId: { in: devisIds } }
    })

    // Assembler la réponse
    const sorties = devisAvecPetitMateriel.map(devis => {
      const lignesConditionnees = devis.lignes.map(l => {
        const cond = conditionnements.find(
          c => c.devisId === devis.id && c.articleId === l.articleId
        )
        return {
          id: l.id,
          articleId: l.articleId,
          designation: l.designation,
          quantite: l.quantite,
          article: l.article,
          conditionne: cond ? cond.valide : false,
          dateValidation: cond?.dateValidation || null
        }
      })

      const totalArticles = lignesConditionnees.reduce((acc, l) => acc + l.quantite, 0)
      const articlesConditionnes = lignesConditionnees
        .filter(l => l.conditionne)
        .reduce((acc, l) => acc + l.quantite, 0)

      return {
        id: devis.id,
        numero: devis.numero,
        dateEvenement: devis.dateEvenement,
        lieuEvenement: devis.lieuEvenement,
        client: devis.client,
        statutDevis: devis.statut,
        totalArticles,
        articlesConditionnes,
        estComplet: totalArticles > 0 && totalArticles === articlesConditionnes,
        lignes: lignesConditionnees
      }
    })

    return NextResponse.json({ succes: true, donnees: sorties })
  } catch (erreur) {
    console.error('[API Atelier Sorties GET]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { devisId, articleId, quantite, valide, toutLeDevis } = corps

    if (!devisId) {
      return NextResponse.json({ succes: false, message: 'devisId requis' }, { status: 400 })
    }

    // Si on coche/décoche tout un événement
    if (toutLeDevis) {
      const devis = await prisma.devis.findUnique({
        where: { id: devisId },
        include: {
          lignes: {
            where: { article: { type: 'PETIT_MATERIEL' } }
          }
        }
      })

      if (!devis) {
        return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
      }

      for (const ligne of devis.lignes) {
        if (!ligne.articleId) continue
        await prisma.conditionnementAtelier.upsert({
          where: {
            devisId_articleId: {
              devisId,
              articleId: ligne.articleId
            }
          },
          update: {
            valide: Boolean(valide),
            dateValidation: valide ? new Date() : null
          },
          create: {
            devisId,
            articleId: ligne.articleId,
            quantite: ligne.quantite,
            valide: Boolean(valide),
            dateValidation: valide ? new Date() : null
          }
        })
      }

      return NextResponse.json({ succes: true, message: 'Conditionnement du devis mis à jour' })
    }

    // Validation unitaire d'un article
    if (!articleId) {
      return NextResponse.json({ succes: false, message: 'articleId requis' }, { status: 400 })
    }

    const enregistrement = await prisma.conditionnementAtelier.upsert({
      where: {
        devisId_articleId: {
          devisId,
          articleId
        }
      },
      update: {
        valide: Boolean(valide),
        dateValidation: valide ? new Date() : null
      },
      create: {
        devisId,
        articleId,
        quantite: parseInt(quantite, 10) || 1,
        valide: Boolean(valide),
        dateValidation: valide ? new Date() : null
      }
    })

    return NextResponse.json({ succes: true, donnees: enregistrement })
  } catch (erreur) {
    console.error('[API Atelier Sorties POST]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
