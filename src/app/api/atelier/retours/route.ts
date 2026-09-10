import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'

export async function GET(requete: NextRequest) {
  try {
    const roleCookie = requete.cookies.get('isylok_role')?.value
    const estOperateurAtelier = roleCookie === 'OPERATEUR_ATELIER'

    // Récupérer les déclarations de casse récentes
    const declarations = await prisma.declarationCasse.findMany({
      include: {
        client: { select: { id: true, nom: true, prenom: true, entreprise: true, telephone: true } },
        article: { select: { id: true, nom: true, reference: true, photoUrl: true } },
        caution: true
      },
      orderBy: { dateCreation: 'desc' },
      take: 50
    })

    // Récupérer les événements récents pour le pointage retour
    const evenementsRecents = await prisma.devis.findMany({
      where: {
        statut: { in: ['VALIDE', 'FACTURE', 'ENVOYE'] },
        lignes: { some: { article: { type: 'PETIT_MATERIEL' } } }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            cautions: { where: { statut: 'EN_ATTENTE' } }
          }
        },
        lignes: {
          where: { article: { type: 'PETIT_MATERIEL' } },
          include: {
            article: {
              select: {
                id: true,
                nom: true,
                reference: true,
                type: true,
                categorie: { select: { nom: true } }
              }
            }
          }
        }
      },
      orderBy: { dateEvenement: 'desc' },
      take: 20
    })

    // Masquage des montants pour OPERATEUR_ATELIER
    const declarationsNettoyees = declarations.map(d => {
      if (estOperateurAtelier) {
        return {
          ...d,
          impactCaution: null,
          caution: d.caution ? { ...d.caution, montant: 0 } : null
        }
      }
      return d
    })

    return NextResponse.json({
      succes: true,
      donnees: {
        evenements: evenementsRecents,
        declarations: declarationsNettoyees
      }
    })
  } catch (erreur) {
    console.error('[API Atelier Retours GET]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const {
      clientId,
      devisId,
      articleId,
      quantite,
      motif, // 'CASSE' | 'PERTE' | 'DEGRADATION'
      description,
      envoyerResteAuLavage,
      quantiteAuLavage
    } = corps

    if (!clientId || !articleId || !quantite) {
      return NextResponse.json(
        { succes: false, message: 'Client, article et quantité requis' },
        { status: 400 }
      )
    }

    const qteNum = parseInt(quantite, 10) || 1

    // Vérifier l'article
    const article = await prisma.article.findUnique({ where: { id: articleId } })
    if (!article) {
      return NextResponse.json({ succes: false, message: 'Article introuvable' }, { status: 404 })
    }

    // Récupérer la caution active du client
    const caution = await prisma.caution.findFirst({
      where: { clientId, statut: 'EN_ATTENTE' },
      orderBy: { dateCreation: 'desc' }
    })

    // Enregistrer la déclaration de casse
    const declaration = await prisma.declarationCasse.create({
      data: {
        clientId,
        devisId: devisId || null,
        articleId,
        quantite: qteNum,
        motif: motif || 'CASSE',
        description: description || null,
        cautionId: caution ? caution.id : null,
        impactCaution: article.prixVente ? article.prixVente * qteNum : null
      },
      include: {
        article: true,
        client: true
      }
    })

    // Mise à jour du dossier client / caution associé
    if (caution) {
      const noteAjout = `[Atelier ${new Date().toLocaleDateString('fr-FR')}] ⚠️ ${qteNum}x ${article.nom} (${motif})${description ? ` : ${description}` : ''}`
      const nouvellesNotes = caution.notes ? `${caution.notes}\n${noteAjout}` : noteAjout

      await prisma.caution.update({
        where: { id: caution.id },
        data: {
          notes: nouvellesNotes
        }
      })
    }

    // Mise à jour de la fiche client
    const clientNoteAjout = `[Atelier ${new Date().toLocaleDateString('fr-FR')}] Signalement ${motif} : ${qteNum}x ${article.nom}`
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (client) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          notes: client.notes ? `${client.notes}\n${clientNoteAjout}` : clientNoteAjout
        }
      })
    }

    // Option : envoyer le reste ou la restitution en lot de lavage
    if (envoyerResteAuLavage && quantiteAuLavage && quantiteAuLavage > 0) {
      const annee = new Date().getFullYear()
      const count = await prisma.lotLavage.count()
      const numero = genererNumero('LOT', annee, count + 1)
      const typeLavage = article.nom.toLowerCase().includes('nappe') || article.nom.toLowerCase().includes('serviette') ? 'TEXTILE' : 'VAISSELLE'

      await prisma.lotLavage.create({
        data: {
          numero,
          articleId,
          quantite: parseInt(quantiteAuLavage, 10),
          statut: 'A_LAVER',
          type: typeLavage,
          evenementOrigine: devisId ? `Devis ${devisId}` : null,
          notes: `Retour client ${client?.nom || ''} après contrôle`
        }
      })
    }

    return NextResponse.json({
      succes: true,
      message: 'Déclaration de casse enregistrée et dossier caution mis à jour',
      donnees: declaration
    }, { status: 201 })
  } catch (erreur) {
    console.error('[API Atelier Retours POST]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de l\'enregistrement' }, { status: 500 })
  }
}
