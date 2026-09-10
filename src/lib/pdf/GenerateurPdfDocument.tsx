import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream
} from '@react-pdf/renderer'

// Palette graphique professionnelle Isy Lok
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
  // En-tête
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: orIsy,
    paddingBottom: 16
  },
  logoBloc: {
    maxWidth: 260
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
    marginBottom: 8,
    fontFamily: 'Helvetica-Oblique'
  },
  coordonneesEntreprise: {
    fontSize: 8,
    color: texteMoyen,
    lineHeight: 1.3
  },
  documentCartouche: {
    alignItems: 'flex-end',
    minWidth: 200
  },
  documentBadge: {
    backgroundColor: orIsy,
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  documentReference: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre,
    marginBottom: 4
  },
  documentMetadonnees: {
    fontSize: 8.5,
    color: texteMoyen,
    textAlign: 'right',
    lineHeight: 1.3
  },

  // Section Informations (2 colonnes)
  sectionInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16
  },
  carteInfos: {
    flex: 1,
    backgroundColor: fondLigne,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: bordureClair
  },
  carteTitre: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: orIsy,
    borderBottomWidth: 0.5,
    borderBottomColor: orIsy,
    paddingBottom: 4,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  carteLigne: {
    fontSize: 8.5,
    marginBottom: 2,
    color: texteSombre
  },
  carteLigneGras: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },

  // Tableau des prestations
  tableau: {
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: bordureClair,
    borderRadius: 6,
    overflow: 'hidden'
  },
  tableauEntete: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    paddingVertical: 7,
    paddingHorizontal: 8
  },
  tableauLigne: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: bordureClair,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  tableauLigneAlternance: {
    backgroundColor: fondLigne
  },

  // Colonnes du tableau
  colonneDesignation: { flex: 4 },
  colonneQuantite: { flex: 1, textAlign: 'center' },
  colonnePrixUnitaire: { flex: 1.5, textAlign: 'right' },
  colonneRemise: { flex: 1.2, textAlign: 'right' },
  colonneTotalLigne: { flex: 1.5, textAlign: 'right' },

  // Récapitulatif financier
  sectionFinanciere: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20
  },
  totauxBloc: {
    width: 250,
    backgroundColor: fondLigne,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: bordureClair
  },
  ligneTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 8.5
  },
  ligneTotalGras: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: orIsy,
    marginTop: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },
  mention293B: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 0.5,
    borderColor: '#93c5fd',
    borderRadius: 4,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#1e40af',
    textAlign: 'center'
  },

  // Pied de page
  piedDePage: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: bordureClair,
    paddingTop: 12
  },
  basDePageGrille: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12
  },
  blocReglement: {
    flex: 1.3,
    fontSize: 7.5,
    color: texteMoyen,
    lineHeight: 1.3
  },
  blocSignature: {
    flex: 1,
    borderWidth: 1,
    borderColor: bordureClair,
    borderRadius: 6,
    padding: 8,
    minHeight: 65,
    justifyContent: 'space-between'
  },
  signatureTitre: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: texteSombre
  },
  signatureMention: {
    fontSize: 6.5,
    color: texteClair,
    fontFamily: 'Helvetica-Oblique'
  },
  mentionsLegalesFinales: {
    fontSize: 7,
    color: texteClair,
    textAlign: 'center',
    lineHeight: 1.3
  }
})

// Fonctions utilitaires de formatage
function formaterEuros(montant: number | undefined | null): string {
  if (montant === undefined || montant === null || isNaN(montant)) return '0,00 €'
  return `${montant.toFixed(2).replace('.', ',')} €`
}

function formaterDateLocale(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export interface DonneesDocumentPdf {
  typeDocument: 'DEVIS' | 'FACTURE'
  numero: string
  dateCreation: string | Date
  dateValiditeOuEcheance?: string | Date | null
  statut: string

  entreprise: {
    nom: string
    adresse?: string | null
    telephone?: string | null
    email?: string | null
    siteWeb?: string | null
    siret?: string | null
    numTVA?: string | null
    formeJuridique?: string | null
    iban?: string | null
    bic?: string | null
  }

  client: {
    nom: string
    prenom?: string | null
    entreprise?: string | null
    adresse?: string | null
    ville?: string | null
    telephone?: string | null
    email?: string | null
  }

  evenement?: {
    date?: string | Date | null
    lieu?: string | null
    type?: string | null
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

  sousTotalBrut: number
  remiseGlobale?: number
  sousTotalNet: number
  tauxTva: number
  montantTva: number
  totalTtc: number
  conditionsReglement?: string | null
}

export function DocumentPdf({ donnees }: { donnees: DonneesDocumentPdf }) {
  const estDevis = donnees.typeDocument === 'DEVIS'
  const clientNomComplet = `${donnees.client.prenom ? `${donnees.client.prenom} ` : ''}${donnees.client.nom}`

  return (
    <Document title={`${donnees.numero} - Isy Lok`} author="Isy Lok" creator="Isy Lok ERP">
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE */}
        <View style={styles.entete}>
          <View style={styles.logoBloc}>
            <Text style={styles.logoTitre}>{donnees.entreprise.nom || 'ISY LOK'}</Text>
            <Text style={styles.logoSousTitre}>Location de matériel événementiel & logistique</Text>
            <View style={styles.coordonneesEntreprise}>
              {donnees.entreprise.adresse && <Text>{donnees.entreprise.adresse}</Text>}
              <Text>
                {donnees.entreprise.telephone ? `Tél : ${donnees.entreprise.telephone}  •  ` : ''}
                {donnees.entreprise.email || 'contact@isylok.mq'}
              </Text>
              {donnees.entreprise.siteWeb && <Text>{donnees.entreprise.siteWeb}</Text>}
              {donnees.entreprise.siret && <Text>SIRET : {donnees.entreprise.siret}</Text>}
              {donnees.entreprise.numTVA && <Text>N° TVA : {donnees.entreprise.numTVA}</Text>}
              {donnees.entreprise.formeJuridique && <Text>{donnees.entreprise.formeJuridique}</Text>}
            </View>
          </View>

          <View style={styles.documentCartouche}>
            <Text style={styles.documentBadge}>
              {estDevis ? 'DEVIS OFFICIEL' : 'FACTURE'}
            </Text>
            <Text style={styles.documentReference}>{donnees.numero}</Text>
            <View style={styles.documentMetadonnees}>
              <Text>Date d&apos;émission : {formaterDateLocale(donnees.dateCreation)}</Text>
              <Text>
                {estDevis
                  ? `Validité : ${formaterDateLocale(donnees.dateValiditeOuEcheance || new Date(Date.now() + 30 * 86400000))}`
                  : `Échéance de paiement : ${formaterDateLocale(donnees.dateValiditeOuEcheance)}`}
              </Text>
              <Text>Statut : {donnees.statut}</Text>
            </View>
          </View>
        </View>

        {/* SECTION INFOS CLIENT & ÉVÉNEMENT */}
        <View style={styles.sectionInfos}>
          {/* Bloc Client */}
          <View style={styles.carteInfos}>
            <Text style={styles.carteTitre}>Client / Destinataire</Text>
            <Text style={styles.carteLigneGras}>{clientNomComplet}</Text>
            {donnees.client.entreprise && (
              <Text style={styles.carteLigne}>Société : {donnees.client.entreprise}</Text>
            )}
            {(donnees.client.adresse || donnees.client.ville) && (
              <Text style={styles.carteLigne}>
                {donnees.client.adresse ? `${donnees.client.adresse}, ` : ''}
                {donnees.client.ville || ''}
              </Text>
            )}
            {donnees.client.telephone && (
              <Text style={styles.carteLigne}>Tél : {donnees.client.telephone}</Text>
            )}
            {donnees.client.email && (
              <Text style={styles.carteLigne}>Email : {donnees.client.email}</Text>
            )}
          </View>

          {/* Bloc Événement */}
          <View style={styles.carteInfos}>
            <Text style={styles.carteTitre}>Détails de l&apos;Événement</Text>
            <Text style={styles.carteLigne}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Date prévue : </Text>
              {formaterDateLocale(donnees.evenement?.date)}
            </Text>
            <Text style={styles.carteLigne}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Lieu : </Text>
              {donnees.evenement?.lieu || 'À définir avec le client'}
            </Text>
            {donnees.evenement?.type && (
              <Text style={styles.carteLigne}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Format : </Text>
                {donnees.evenement.type}
              </Text>
            )}
            <Text style={styles.carteLigne}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Régime fiscal : </Text>
              {donnees.tauxTva === 0 ? 'Exonéré (Art. 293 B)' : `TVA DOM (${donnees.tauxTva.toString().replace('.', ',')}%)`}
            </Text>
          </View>
        </View>

        {/* TABLEAU DES PRESTATIONS */}
        <View style={styles.tableau}>
          <View style={styles.tableauEntete}>
            <Text style={styles.colonneDesignation}>Désignation de la prestation / matériel</Text>
            <Text style={styles.colonneQuantite}>Qté</Text>
            <Text style={styles.colonnePrixUnitaire}>P.U. HT</Text>
            <Text style={styles.colonneRemise}>Remise</Text>
            <Text style={styles.colonneTotalLigne}>Total HT</Text>
          </View>

          {donnees.lignes.map((ligne, index) => (
            <View
              key={ligne.id || index.toString()}
              style={[
                styles.tableauLigne,
                index % 2 === 1 ? styles.tableauLigneAlternance : {}
              ]}
            >
              <View style={styles.colonneDesignation}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: texteSombre }}>
                  {ligne.designation}
                </Text>
                {ligne.description && (
                  <Text style={{ fontSize: 7.5, color: texteClair, marginTop: 1 }}>
                    {ligne.description}
                  </Text>
                )}
              </View>
              <Text style={styles.colonneQuantite}>{ligne.quantite}</Text>
              <Text style={styles.colonnePrixUnitaire}>{formaterEuros(ligne.prixUnitaire)}</Text>
              <Text style={styles.colonneRemise}>
                {ligne.remiseLigne && ligne.remiseLigne > 0 ? `-${formaterEuros(ligne.remiseLigne)}` : '—'}
              </Text>
              <Text style={[styles.colonneTotalLigne, { fontFamily: 'Helvetica-Bold' }]}>
                {formaterEuros(ligne.totalLigne)}
              </Text>
            </View>
          ))}
        </View>

        {/* SECTION FINANCIÈRE */}
        <View style={styles.sectionFinanciere}>
          <View style={styles.totauxBloc}>
            <View style={styles.ligneTotal}>
              <Text style={{ color: texteMoyen }}>Sous-total brut HT :</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formaterEuros(donnees.sousTotalBrut)}</Text>
            </View>

            {donnees.remiseGlobale !== undefined && donnees.remiseGlobale > 0 && (
              <View style={styles.ligneTotal}>
                <Text style={{ color: '#d97706' }}>Remise globale accordée :</Text>
                <Text style={{ color: '#d97706', fontFamily: 'Helvetica-Bold' }}>
                  -{formaterEuros(donnees.remiseGlobale)}
                </Text>
              </View>
            )}

            <View style={styles.ligneTotal}>
              <Text style={{ color: texteMoyen }}>Total net HT :</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formaterEuros(donnees.sousTotalNet)}</Text>
            </View>

            <View style={styles.ligneTotal}>
              <Text style={{ color: texteMoyen }}>
                TVA ({donnees.tauxTva.toString().replace('.', ',')}%) :
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formaterEuros(donnees.montantTva)}</Text>
            </View>

            {donnees.tauxTva === 0 && (
              <Text style={styles.mention293B}>
                TVA non applicable, art. 293 B du CGI
              </Text>
            )}

            <View style={styles.ligneTotalGras}>
              <Text style={{ color: orIsy }}>TOTAL TTC À PAYER :</Text>
              <Text style={{ color: orIsy, fontSize: 11 }}>{formaterEuros(donnees.totalTtc)}</Text>
            </View>
          </View>
        </View>

        {/* PIED DE PAGE & MODALITÉS */}
        <View style={styles.piedDePage}>
          <View style={styles.basDePageGrille}>
            {/* Règlement & Banque */}
            <View style={styles.blocReglement}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: texteSombre, marginBottom: 2 }}>
                Modalités de règlement :
              </Text>
              <Text>
                Virement bancaire ou carte bancaire à réception.
              </Text>
              {donnees.entreprise.iban && (
                <Text style={{ marginTop: 2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>IBAN : </Text>
                  {donnees.entreprise.iban}
                </Text>
              )}
              {donnees.entreprise.bic && (
                <Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>BIC : </Text>
                  {donnees.entreprise.bic}
                </Text>
              )}
              <Text style={{ marginTop: 3, fontSize: 6.5, color: texteClair }}>
                Clause de réserve de propriété : Les marchandises louées ou vendues restent la propriété exclusive d&apos;Isy Lok jusqu&apos;à complet encaissement (loi n° 80-335).
              </Text>
            </View>

            {/* Cadre de signature */}
            <View style={styles.blocSignature}>
              <Text style={styles.signatureTitre}>
                {estDevis ? 'Bon pour accord et commande' : 'Reçu et validé par le client'}
              </Text>
              <Text style={styles.signatureMention}>
                Date et signature précédées de la mention manuscrite &quot;Lu et approuvé&quot; :
              </Text>
              <View style={{ height: 28 }} />
            </View>
          </View>

          <Text style={styles.mentionsLegalesFinales}>
            {donnees.entreprise.nom || 'Isy Lok'} • SAS au capital de 20 000 € • SIRET {donnees.entreprise.siret || '123 456 789 00012'} • APE 7739Z • Document généré électroniquement par le système Isy Lok.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function creerFluxPdfDocument(donnees: DonneesDocumentPdf) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await renderToStream(React.createElement(DocumentPdf, { donnees }) as any)
}

