import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { creerFluxPdfDocument, DonneesDocumentPdf } from '@/lib/pdf/GenerateurPdfDocument'

export async function GET(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: true
      }
    })

    if (!devis) {
      return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
    }

    const parametres = await prisma.parametresEntreprise.findFirst()
    const download = requete.nextUrl.searchParams.get('download') === '1'

    const sousTotalBrut = devis.sousTotal || devis.lignes.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire), 0)
    const remiseGlobale = devis.remise || 0
    const sousTotalNet = Math.max(0, sousTotalBrut - remiseGlobale)

    const donnees: DonneesDocumentPdf = {
      typeDocument: 'DEVIS',
      numero: devis.numero,
      dateCreation: devis.dateCreation,
      dateValiditeOuEcheance: new Date(new Date(devis.dateCreation).getTime() + 30 * 24 * 60 * 60 * 1000),
      statut: devis.statut,
      entreprise: {
        nom: parametres?.nom || 'Isy Lok Martinique',
        adresse: parametres?.adresse || 'Z.I. La Lézarde, 97232 Le Lamentin',
        telephone: parametres?.telephone || '05 96 12 34 56',
        email: parametres?.email || 'contact@isylok.mq',
        siteWeb: parametres?.siteWeb || 'www.isylok.mq',
        siret: parametres?.siret || '123 456 789 00012',
        numTVA: parametres?.numTVA || 'FR 12 3456789',
        formeJuridique: parametres?.formeJuridique || 'SAS au capital de 20 000€ - RCS Fort-de-France',
        iban: parametres?.iban || 'FR76 1234 5678 9012 3456 7890 123',
        bic: parametres?.bic || 'AGRIFR2P'
      },
      client: {
        nom: devis.client.nom,
        prenom: devis.client.prenom,
        entreprise: devis.client.entreprise,
        adresse: devis.client.adresse,
        ville: devis.client.ville,
        telephone: devis.client.telephone,
        email: devis.client.email
      },
      evenement: {
        date: devis.dateEvenement,
        lieu: devis.lieuEvenement,
        type: devis.typeEvenement
      },
      lignes: devis.lignes.map(l => ({
        id: l.id,
        designation: l.designation,
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        remiseLigne: l.remiseLigne,
        totalLigne: l.totalLigne
      })),
      sousTotalBrut,
      remiseGlobale,
      sousTotalNet,
      tauxTva: devis.tauxTva ?? 8.5,
      montantTva: devis.montantTva,
      totalTtc: devis.totalTtc
    }

    const stream = await creerFluxPdfDocument(donnees)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${devis.numero}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (erreur) {
    console.error('[API Devis PDF] Erreur génération PDF:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
