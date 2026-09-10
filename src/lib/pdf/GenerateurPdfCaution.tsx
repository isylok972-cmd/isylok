import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream
} from '@react-pdf/renderer'

const orIsy = '#B8922A'
const texteSombre = '#0f172a'
const texteMoyen = '#475569'
const texteClair = '#64748b'
const fondLigne = '#f8fafc'
const bordureClair = '#e2e8f0'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: texteSombre,
    lineHeight: 1.4,
    backgroundColor: '#ffffff'
  },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: orIsy,
    paddingBottom: 14
  },
  logoBloc: {
    maxWidth: 280
  },
  logoTitre: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: orIsy,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  logoSousTitre: {
    fontSize: 8.5,
    color: texteClair,
    marginBottom: 6,
    fontFamily: 'Helvetica-Oblique'
  },
  coordonneesEntreprise: {
    fontSize: 8,
    color: texteMoyen,
    lineHeight: 1.3
  },
  documentCartouche: {
    alignItems: 'flex-end',
    minWidth: 220
  },
  documentBadge: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  documentReference: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre,
    marginBottom: 3
  },
  documentMetadonnees: {
    fontSize: 8,
    color: texteMoyen,
    textAlign: 'right',
    lineHeight: 1.3
  },
  sectionInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 14
  },
  carteInfos: {
    flex: 1,
    backgroundColor: fondLigne,
    borderRadius: 5,
    padding: 9,
    borderWidth: 1,
    borderColor: bordureClair
  },
  carteTitre: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: orIsy,
    borderBottomWidth: 0.5,
    borderBottomColor: orIsy,
    paddingBottom: 3,
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  carteLigne: {
    fontSize: 8,
    marginBottom: 2,
    color: texteSombre
  },
  carteLigneGras: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },
  // Bloc état et règle comptable
  blocAvertissementComptable: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    padding: 8,
    borderRadius: 3,
    marginBottom: 14
  },
  avertissementTitre: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 2
  },
  avertissementTexte: {
    fontSize: 7.5,
    color: '#166534'
  },
  // Tableau
  tableau: {
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: bordureClair,
    borderRadius: 5,
    overflow: 'hidden'
  },
  tableauEntete: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  tableauLigne: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: bordureClair,
    fontSize: 8
  },
  tableauLigneAlt: {
    backgroundColor: fondLigne
  },
  // Totaux & Décompte financier
  sectionTotaux: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16
  },
  blocTotaux: {
    width: 250,
    backgroundColor: fondLigne,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: bordureClair
  },
  ligneTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5
  },
  labelTotal: {
    fontSize: 8.5,
    color: texteMoyen
  },
  valeurTotal: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },
  ligneGrandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: orIsy,
    marginTop: 5,
    paddingTop: 5
  },
  labelGrandTotal: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },
  valeurGrandTotal: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0d9488'
  },
  // Signatures
  blocSignatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 10,
    marginBottom: 16
  },
  carteSignature: {
    flex: 1,
    borderWidth: 1,
    borderColor: bordureClair,
    borderRadius: 5,
    padding: 9,
    backgroundColor: fondLigne
  },
  signatureTitre: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre,
    marginBottom: 3
  },
  signatureSous: {
    fontSize: 7,
    color: texteClair,
    marginBottom: 32
  },
  piedPage: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: bordureClair,
    paddingTop: 8,
    fontSize: 7,
    color: texteClair,
    textAlign: 'center'
  }
})

export interface DonneesCautionPdf {
  caution: {
    id: string
    montant: number
    type: string
    reference: string | null
    statut: string
    dateDepot: string | Date | null
    dateRestitution: string | Date | null
    montantRetenu: number
    montantRestitue: number | null
    motifRetenue: string | null
    notes: string | null
    dateCreation: string | Date
  }
  client: {
    nom: string
    prenom: string | null
    entreprise: string | null
    telephone: string
    email: string | null
    adresse: string | null
    codePostal: string | null
    ville: string | null
  }
  devis?: {
    numero: string
    dateEvenement: string | Date | null
    lieuEvenement: string | null
  } | null
  casses?: Array<{
    articleNom: string
    quantite: number
    motif: string
    description: string | null
    impactCaution: number | null
  }>
  entreprise: {
    nom?: string
    adresse?: string | null
    telephone?: string | null
    email?: string | null
    siret?: string | null
    iban?: string | null
    bic?: string | null
  }
}

function formaterEuro(val: number): string {
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formaterDatePdf(d: string | Date | null | undefined): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function labelTypePaiement(type: string): string {
  switch (type) {
    case 'CHEQUE': return 'Chèque de caution'
    case 'CB_EMPREINTE': return 'Empreinte Carte Bancaire'
    case 'ESPECES': return 'Dépôt en espèces'
    case 'VIREMENT': return 'Virement bancaire'
    default: return type
  }
}

function DocumentPdfCaution({ donnees }: { donnees: DonneesCautionPdf }) {
  const { caution, client, devis, casses = [], entreprise } = donnees

  const estRestitue = caution.statut === 'RESTITUE'
  const estEncaissePartiel = caution.statut === 'ENCAISSE_PARTIEL'
  const estEncaisseTotal = caution.statut === 'ENCAISSE_TOTAL'
  const estEnCours = caution.statut === 'RECU_NON_ENCAISSE' || caution.statut === 'EN_ATTENTE_DEPOT'

  let titreBadge = 'RÉCÉPISSÉ DE DÉPÔT'
  if (estRestitue) titreBadge = 'ATTESTATION DE RESTITUTION TOTALE'
  else if (estEncaissePartiel) titreBadge = 'RESTITUTION AVEC RETENUE'
  else if (estEncaisseTotal) titreBadge = 'REÇU D’ENCAISSEMENT DE CAUTION'

  const montantInitial = caution.montant || 0
  const montantRetenu = caution.montantRetenu || 0
  const montantRestitue = caution.montantRestitue ?? Math.max(0, montantInitial - montantRetenu)

  return (
    <Document title={`Caution-${caution.id.slice(-8)}`} author="Isy Lok" subject="Attestation de caution">
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.entete}>
          <View style={styles.logoBloc}>
            <Text style={styles.logoTitre}>{entreprise.nom || 'ISY LOK'}</Text>
            <Text style={styles.logoSousTitre}>Location de Matériel Événementiel &amp; Logistique</Text>
            <Text style={styles.coordonneesEntreprise}>
              {entreprise.adresse || 'Z.I. La Lézarde — 97232 Le Lamentin (Martinique)'}{'\n'}
              Tél : {entreprise.telephone || '0596 00 00 00'} • Email : {entreprise.email || 'contact@isylok.com'}{'\n'}
              SIRET : {entreprise.siret || '123 456 789 00012'}
            </Text>
          </View>

          <View style={styles.documentCartouche}>
            <Text style={styles.documentBadge}>{titreBadge}</Text>
            <Text style={styles.documentReference}>DOSSIER N° CAU-{caution.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.documentMetadonnees}>
              Date d’émission : {formaterDatePdf(new Date())}{'\n'}
              Date de dépôt initial : {formaterDatePdf(caution.dateDepot || caution.dateCreation)}{'\n'}
              {caution.dateRestitution && `Date de clôture : ${formaterDatePdf(caution.dateRestitution)}\n`}
              {devis?.numero && `Devis associé : ${devis.numero}`}
            </Text>
          </View>
        </View>

        {/* Section Infos 2 colonnes */}
        <View style={styles.sectionInfos}>
          {/* Client */}
          <View style={styles.carteInfos}>
            <Text style={styles.carteTitre}>Client / Déposant</Text>
            <Text style={styles.carteLigneGras}>
              {client.entreprise ? `${client.entreprise} (Attn: ${client.prenom ? client.prenom + ' ' : ''}${client.nom})` : `${client.prenom ? client.prenom + ' ' : ''}${client.nom}`}
            </Text>
            {client.adresse && <Text style={styles.carteLigne}>{client.adresse}</Text>}
            {(client.codePostal || client.ville) && (
              <Text style={styles.carteLigne}>{[client.codePostal, client.ville].filter(Boolean).join(' ')}</Text>
            )}
            <Text style={styles.carteLigne}>Tél : {client.telephone}</Text>
            {client.email && <Text style={styles.carteLigne}>Email : {client.email}</Text>}
          </View>

          {/* Événement & Dépôt */}
          <View style={styles.carteInfos}>
            <Text style={styles.carteTitre}>Modalités de la Garantie</Text>
            <Text style={styles.carteLigne}>
              <Text style={styles.carteLigneGras}>Mode de dépôt : </Text>
              {labelTypePaiement(caution.type)}
            </Text>
            {caution.reference && (
              <Text style={styles.carteLigne}>
                <Text style={styles.carteLigneGras}>Réf / N° Chèque : </Text>
                {caution.reference}
              </Text>
            )}
            {devis && (
              <>
                <Text style={styles.carteLigne}>
                  <Text style={styles.carteLigneGras}>Événement lié : </Text>
                  {devis.numero} {devis.dateEvenement ? `(${formaterDatePdf(devis.dateEvenement)})` : ''}
                </Text>
                {devis.lieuEvenement && (
                  <Text style={styles.carteLigne}>
                    <Text style={styles.carteLigneGras}>Lieu : </Text>
                    {devis.lieuEvenement}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Note comptable légale */}
        <View style={styles.blocAvertissementComptable}>
          <Text style={styles.avertissementTitre}>Statut Comptable &amp; Juridique du Dépôt de Garantie</Text>
          <Text style={styles.avertissementTexte}>
            Ce document atteste de la prise en charge ou de la restitution d&apos;un dépôt de garantie. Conformément aux règles comptables en vigueur, les sommes remises à titre de caution restent la propriété du déposant et ne constituent pas un produit d&apos;exploitation (hors Chiffre d&apos;Affaires). Seules les indemnités forfaitaires de remise en état ou dégradations retenues font l&apos;objet d&apos;une facturation.
          </Text>
        </View>

        {/* Détail des dégradations ou signalements de casse s'il y en a */}
        {casses.length > 0 && (
          <View>
            <Text style={[styles.carteTitre, { marginBottom: 4 }]}>
              Constat Atelier / Signalements de Dégradations ou Casses
            </Text>
            <View style={styles.tableau}>
              <View style={styles.tableauEntete}>
                <Text style={{ flex: 3 }}>Article / Matériel</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>Quantité</Text>
                <Text style={{ flex: 1.5 }}>Constat</Text>
                <Text style={{ flex: 1.5, textAlign: 'right' }}>Impact Caution</Text>
              </View>
              {casses.map((c, i) => (
                <View key={i} style={[styles.tableauLigne, i % 2 === 1 ? styles.tableauLigneAlt : {}]}>
                  <Text style={{ flex: 3 }}>{c.articleNom}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{c.quantite} ex.</Text>
                  <Text style={{ flex: 1.5 }}>{c.motif} {c.description ? `(${c.description})` : ''}</Text>
                  <Text style={{ flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {c.impactCaution ? formaterEuro(c.impactCaution) : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Décompte financier */}
        <View style={styles.sectionTotaux}>
          <View style={styles.blocTotaux}>
            <View style={styles.ligneTotal}>
              <Text style={styles.labelTotal}>Montant de la caution reçue :</Text>
              <Text style={styles.valeurTotal}>{formaterEuro(montantInitial)}</Text>
            </View>
            <View style={styles.ligneTotal}>
              <Text style={styles.labelTotal}>Retenue pour casse / dégradation :</Text>
              <Text style={[styles.valeurTotal, { color: montantRetenu > 0 ? '#dc2626' : texteSombre }]}>
                - {formaterEuro(montantRetenu)}
              </Text>
            </View>
            {caution.motifRetenue && (
              <Text style={{ fontSize: 7, color: '#dc2626', marginBottom: 4, fontStyle: 'italic' }}>
                Motif retenue : {caution.motifRetenue}
              </Text>
            )}
            <View style={styles.ligneGrandTotal}>
              <Text style={styles.labelGrandTotal}>
                {estEncaisseTotal ? 'Montant conservé / encaissé :' : 'Montant restitué au client :'}
              </Text>
              <Text style={[styles.valeurGrandTotal, { color: estEncaisseTotal ? '#dc2626' : '#0d9488' }]}>
                {formaterEuro(estEncaisseTotal ? montantInitial : montantRestitue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Observations éventuelles */}
        {caution.notes && (
          <View style={[styles.carteInfos, { marginBottom: 14 }]}>
            <Text style={styles.carteTitre}>Observations / Modalités de restitution</Text>
            <Text style={styles.carteLigne}>{caution.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.blocSignatures}>
          <View style={styles.carteSignature}>
            <Text style={styles.signatureTitre}>Pour la société Isy Lok</Text>
            <Text style={styles.signatureSous}>Signature et cachet commercial :</Text>
          </View>
          <View style={styles.carteSignature}>
            <Text style={styles.signatureTitre}>Le Client / Déposant</Text>
            <Text style={styles.signatureSous}>
              {estEnCours
                ? 'Signature pour remise du dépôt de garantie :'
                : 'Signature pour décharge et accusé de réception :'}
            </Text>
          </View>
        </View>

        {/* Pied de page */}
        <Text style={styles.piedPage}>
          {entreprise.nom || 'Isy Lok'} • Document justificatif officiel de gestion de dépôt de garantie • Valable pour décharge de responsabilité.
        </Text>
      </Page>
    </Document>
  )
}

export async function creerFluxPdfCaution(donnees: DonneesCautionPdf) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await renderToStream(React.createElement(DocumentPdfCaution, { donnees }) as any)
}
