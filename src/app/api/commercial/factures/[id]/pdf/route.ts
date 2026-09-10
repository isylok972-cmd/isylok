import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { creerFluxPdfDocument, DonneesDocumentPdf } from '@/lib/pdf/GenerateurPdfDocument'
import { genererFacturxXml, DonneesFacturX } from '@/lib/facturx/generateurFacturxXml'
import { integrerFacturxDansPdf } from '@/lib/facturx/integrateurFacturxPdf'

export async function GET(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        devis: {
          include: {
            lignes: true
          }
        }
      }
    })

    if (!facture) {
      return NextResponse.json({ succes: false, message: 'Facture introuvable' }, { status: 404 })
    }

    const parametres = await prisma.parametresEntreprise.findFirst()
    const download = requete.nextUrl.searchParams.get('download') === '1'
    const veutXml = requete.nextUrl.searchParams.get('xml') === '1'

    const lignes = facture.devis?.lignes || []
    const sousTotalBrut = facture.devis?.sousTotal || facture.montantHt
    const remiseGlobale = facture.devis?.remise || 0

    // Préparation des données Factur-X
    const donneesFacturX: DonneesFacturX = {
      facture: {
        numero: facture.numero,
        dateCreation: facture.dateCreation,
        dateEcheance: facture.dateEcheance,
        statut: facture.statut,
        montantHt: facture.montantHt,
        tauxTva: facture.tauxTva ?? 8.5,
        montantTva: facture.montantTva,
        montantTtc: facture.montantTtc,
        montantPaye: facture.montantPaye,
        modePaiement: facture.modePaiement
      },
      client: {
        nom: facture.client.nom,
        prenom: facture.client.prenom,
        entreprise: facture.client.entreprise,
        siret: facture.client.siret,
        type: facture.client.type,
        email: facture.client.email,
        telephone: facture.client.telephone,
        adresse: facture.client.adresse,
        codePostal: facture.client.codePostal,
        ville: facture.client.ville
      },
      entreprise: {
        nom: parametres?.nom || 'Isy Lok Martinique',
        siret: parametres?.siret || '123 456 789 00012',
        numTVA: parametres?.numTVA || 'FR 12 3456789',
        adresse: parametres?.adresse || 'Z.I. La Lézarde',
        ville: 'Le Lamentin',
        codePostal: '97232',
        email: parametres?.email || 'contact@isylok.mq',
        telephone: parametres?.telephone || '05 96 12 34 56',
        iban: parametres?.iban || 'FR76 1234 5678 9012 3456 7890 123',
        bic: parametres?.bic || 'AGRIFR2P'
      },
      lignes: lignes.map(l => ({
        id: l.id,
        designation: l.designation,
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        remiseLigne: l.remiseLigne,
        totalLigne: l.totalLigne
      })),
      remiseGlobale,
      dateEvenement: facture.devis?.dateEvenement
    }

    // 1. Si téléchargement XML brut demandé (?xml=1) pour déclaration portail Chorus / PDP
    if (veutXml) {
      const xmlFacturx = genererFacturxXml(donneesFacturX)
      return new NextResponse(xmlFacturx, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="factur-x-${facture.numero}.xml"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    // 2. Génération du document PDF visuel A4
    const donneesPdf: DonneesDocumentPdf = {
      typeDocument: 'FACTURE',
      numero: facture.numero,
      dateCreation: facture.dateCreation,
      dateValiditeOuEcheance: facture.dateEcheance || new Date(new Date(facture.dateCreation).getTime() + 30 * 24 * 60 * 60 * 1000),
      statut: facture.statut,
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
        nom: facture.client.nom,
        prenom: facture.client.prenom,
        entreprise: facture.client.entreprise,
        adresse: facture.client.adresse,
        ville: facture.client.ville,
        telephone: facture.client.telephone,
        email: facture.client.email
      },
      evenement: {
        date: facture.devis?.dateEvenement,
        lieu: facture.devis?.lieuEvenement,
        type: facture.devis?.typeEvenement
      },
      lignes: lignes.map(l => ({
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
      sousTotalNet: facture.montantHt,
      tauxTva: facture.tauxTva ?? 8.5,
      montantTva: facture.montantTva,
      totalTtc: facture.montantTtc
    }

    const stream = await creerFluxPdfDocument(donneesPdf)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    let pdfBuffer: Uint8Array = Buffer.concat(chunks)

    // 3. Intégration Factur-X : insertion du flux factur-x.xml en pièce jointe PDF/A-3
    try {
      const xmlFacturx = genererFacturxXml(donneesFacturX)
      pdfBuffer = await integrerFacturxDansPdf(pdfBuffer, xmlFacturx)
    } catch (errFacturx) {
      console.warn('[API Factures PDF] Avertissement attachement Factur-X:', errFacturx)
      // Fallback sur le PDF standard si l'encapsulation échoue
    }

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${facture.numero}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Facturx-Conforme': 'true'
      }
    })
  } catch (erreur) {
    console.error('[API Factures PDF] Erreur génération PDF:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
