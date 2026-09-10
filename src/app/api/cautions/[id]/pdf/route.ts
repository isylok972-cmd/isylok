import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { creerFluxPdfCaution, DonneesCautionPdf } from '@/lib/pdf/GenerateurPdfCaution'

export async function GET(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const caution = await prisma.caution.findUnique({
      where: { id },
      include: {
        client: true,
        devis: true,
        declarationsCasse: {
          include: {
            article: true
          }
        }
      }
    })

    if (!caution) {
      return NextResponse.json({ succes: false, message: 'Caution introuvable' }, { status: 404 })
    }

    // Récupérer également les casses du même devis non associées
    let casses = caution.declarationsCasse
    if (caution.devisId) {
      const cassesSupp = await prisma.declarationCasse.findMany({
        where: {
          devisId: caution.devisId,
          cautionId: null
        },
        include: {
          article: true
        }
      })
      casses = [...casses, ...cassesSupp]
    }

    const parametres = await prisma.parametresEntreprise.findFirst()
    const download = requete.nextUrl.searchParams.get('download') === '1'

    const donnees: DonneesCautionPdf = {
      caution: {
        id: caution.id,
        montant: caution.montant,
        type: caution.type,
        reference: caution.reference,
        statut: caution.statut,
        dateDepot: caution.dateDepot || caution.dateCreation,
        dateRestitution: caution.dateRestitution,
        montantRetenu: caution.montantRetenu,
        montantRestitue: caution.montantRestitue,
        motifRetenue: caution.motifRetenue,
        notes: caution.notes,
        dateCreation: caution.dateCreation
      },
      client: {
        nom: caution.client.nom,
        prenom: caution.client.prenom,
        entreprise: caution.client.entreprise,
        telephone: caution.client.telephone,
        email: caution.client.email,
        adresse: caution.client.adresse,
        codePostal: caution.client.codePostal,
        ville: caution.client.ville
      },
      devis: caution.devis ? {
        numero: caution.devis.numero,
        dateEvenement: caution.devis.dateEvenement,
        lieuEvenement: caution.devis.lieuEvenement
      } : null,
      casses: casses.map(c => ({
        articleNom: c.article.nom,
        quantite: c.quantite,
        motif: c.motif,
        description: c.description,
        impactCaution: c.impactCaution
      })),
      entreprise: {
        nom: parametres?.nom || 'Isy Lok Martinique',
        adresse: parametres?.adresse || 'Z.I. La Lézarde, 97232 Le Lamentin',
        telephone: parametres?.telephone || '05 96 12 34 56',
        email: parametres?.email || 'contact@isylok.mq',
        siret: parametres?.siret || '123 456 789 00012',
        iban: parametres?.iban || 'FR76 1234 5678 9012 3456 7890 123',
        bic: parametres?.bic || 'AGRIFR2P'
      }
    }

    const stream = await creerFluxPdfCaution(donnees)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    const nomFichier = `Caution-CAU-${caution.id.slice(-6).toUpperCase()}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${nomFichier}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (erreur) {
    console.error('[API Caution PDF] Erreur génération PDF:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur génération PDF' }, { status: 500 })
  }
}
