// ============================================================================
// Isy Lok — Générateur de Flux XML Factur-X (Profils MINIMUM & BASIC)
// Norme européenne EN 16931 / UN/CEFACT CrossIndustryInvoice (CII)
// ============================================================================

export interface DonneesFacturX {
  facture: {
    numero: string
    dateCreation: string | Date
    dateEcheance?: string | Date | null
    statut: string
    montantHt: number
    tauxTva: number
    montantTva: number
    montantTtc: number
    montantPaye?: number
    modePaiement?: string | null
  }
  client: {
    nom: string
    prenom?: string | null
    entreprise?: string | null
    siret?: string | null
    type?: string | null
    email?: string | null
    telephone?: string | null
    adresse?: string | null
    codePostal?: string | null
    ville?: string | null
  }
  entreprise: {
    nom?: string
    siret?: string | null
    numTVA?: string | null
    adresse?: string | null
    ville?: string | null
    codePostal?: string | null
    email?: string | null
    telephone?: string | null
    iban?: string | null
    bic?: string | null
  }
  lignes: Array<{
    id?: string
    designation: string
    description?: string | null
    quantite: number
    prixUnitaire: number
    remiseLigne?: number
    totalLigne: number
  }>
  remiseGlobale?: number
  dateEvenement?: string | Date | null
}

function echapperXml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formaterNombre(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00'
  return val.toFixed(2)
}

function formaterDateFacturX(d: string | Date | null | undefined): string {
  if (!d) {
    const now = new Date()
    return now.toISOString().slice(0, 10).replace(/-/g, '')
  }
  const date = typeof d === 'string' ? new Date(d) : d
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}${mois}${jour}`
}

function determinerCodePaiement(mode: string | null | undefined): string {
  switch (mode?.toUpperCase()) {
    case 'VIREMENT': return '42' // Payment to bank account
    case 'CHEQUE': return '20' // Cheque
    case 'CB':
    case 'CARTE': return '48' // Bank card
    case 'ESPECES': return '10' // Cash
    default: return '42'
  }
}

/**
 * Génère le flux XML Factur-X au profil BASIC (conforme EN 16931)
 */
export function genererFacturxXml(donnees: DonneesFacturX): string {
  const { facture, client, entreprise, lignes, remiseGlobale = 0 } = donnees

  const siretEntreprise = (entreprise.siret || '12345678900012').replace(/\s+/g, '')
  const nomEntreprise = entreprise.nom || 'Isy Lok'
  const tvaEntreprise = entreprise.numTVA || 'FR123456789'
  const adresseEntreprise = entreprise.adresse || 'Z.I. La Lézarde'
  const codePostalEntreprise = entreprise.codePostal || '97232'
  const villeEntreprise = entreprise.ville || 'Le Lamentin'

  // Client
  const nomCompletClient = client.entreprise
    ? client.entreprise
    : [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'
  const siretClient = client.siret ? client.siret.replace(/\s+/g, '') : null
  const codePostalClient = client.codePostal || '97200'
  const villeClient = client.ville || 'Fort-de-France'
  const adresseClient = client.adresse || 'Martinique'

  const tauxTva = facture.tauxTva ?? 8.5
  const estExonere = tauxTva === 0
  const categorieTva = estExonere ? 'E' : 'S'

  const totalBrutLignes = lignes.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire), 0)
  const baseImposable = facture.montantHt
  const montantTva = facture.montantTva
  const totalTtc = facture.montantTtc
  const montantPaye = facture.montantPaye || 0
  const resteAPayer = Math.max(0, totalTtc - montantPaye)

  const dateEmission = formaterDateFacturX(facture.dateCreation)
  const dateEcheance = formaterDateFacturX(facture.dateEcheance || new Date(new Date(facture.dateCreation).getTime() + 30 * 86400000))
  const dateLivraison = formaterDateFacturX(donnees.dateEvenement || facture.dateCreation)

  // Construction des lignes XML
  const lignesXml = lignes.map((ligne, index) => {
    const numLigne = index + 1
    const prixUnitaireNet = ligne.prixUnitaire - (ligne.remiseLigne || 0)
    const prixUnitStr = formaterNombre(prixUnitaireNet)
    const totalLigneStr = formaterNombre(ligne.totalLigne)
    const qteStr = ligne.quantite.toString()

    return `      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${numLigne}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${echapperXml(ligne.designation)}</ram:Name>
          ${ligne.description ? `<ram:Description>${echapperXml(ligne.description)}</ram:Description>` : ''}
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${prixUnitStr}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">${qteStr}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${categorieTva}</ram:CategoryCode>
            <ram:RateApplicablePercent>${formaterNombre(tauxTva)}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${totalLigneStr}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" 
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" 
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" 
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  
  <!-- Factur-X Profil BASIC (EN 16931) -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${echapperXml(facture.numero)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${dateEmission}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${estExonere ? `
    <ram:IncludedNote>
      <ram:Content>TVA non applicable, art. 293 B du CGI</ram:Content>
      <ram:SubjectCode>AAI</ram:SubjectCode>
    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    <!-- Lignes de facture -->
${lignesXml}

    <!-- Émetteur & Destinataire -->
    <ram:ApplicableHeaderTradeAgreement>
      <!-- Vendeur (Isy Lok) -->
      <ram:SellerTradeParty>
        <ram:Name>${echapperXml(nomEntreprise)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${echapperXml(siretEntreprise)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${echapperXml(codePostalEntreprise)}</ram:PostcodeCode>
          <ram:LineOne>${echapperXml(adresseEntreprise)}</ram:LineOne>
          <ram:CityName>${echapperXml(villeEntreprise)}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${echapperXml(tvaEntreprise)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>

      <!-- Client Acheteur -->
      <ram:BuyerTradeParty>
        <ram:Name>${echapperXml(nomCompletClient)}</ram:Name>
        ${siretClient ? `
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${echapperXml(siretClient)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${echapperXml(codePostalClient)}</ram:PostcodeCode>
          <ram:LineOne>${echapperXml(adresseClient)}</ram:LineOne>
          <ram:CityName>${echapperXml(villeClient)}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <!-- Livraison / Événement -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${dateLivraison}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- Règlement & Totaux -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>${determinerCodePaiement(facture.modePaiement)}</ram:TypeCode>
        ${entreprise.iban ? `
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${echapperXml(entreprise.iban.replace(/\s+/g, ''))}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>` : ''}
        ${entreprise.bic ? `
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${echapperXml(entreprise.bic.replace(/\s+/g, ''))}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>

      <!-- Ventilation TVA -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formaterNombre(montantTva)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${estExonere ? '<ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>' : ''}
        <ram:BasisAmount>${formaterNombre(baseImposable)}</ram:BasisAmount>
        <ram:CategoryCode>${categorieTva}</ram:CategoryCode>
        ${estExonere ? '<ram:ExemptionReasonCode>VATEX-EU-293B</ram:ExemptionReasonCode>' : ''}
        <ram:RateApplicablePercent>${formaterNombre(tauxTva)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <!-- Date d'échéance -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dateEcheance}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <!-- Totaux de la facture -->
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formaterNombre(totalBrutLignes)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>0.00</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>${formaterNombre(remiseGlobale)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${formaterNombre(baseImposable)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${formaterNombre(montantTva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formaterNombre(totalTtc)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${formaterNombre(montantPaye)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${formaterNombre(resteAPayer)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}
