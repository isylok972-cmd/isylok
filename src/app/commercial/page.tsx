'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './commercial.module.css'
import { formaterPrix, formaterDate } from '@/lib/utilitaires'
import { ModaleDevis } from './composants/ModaleDevis'
import { BrouillonsIA } from './composants/BrouillonsIA'
import { ModaleApercuPdf } from './composants/ModaleApercuPdf'
import { TableauCautions } from '../cautions/composants/TableauCautions'
import { ModaleGestionCaution, CautionComplete } from '../cautions/composants/ModaleGestionCaution'
import { ModaleNouvelleCaution } from '../cautions/composants/ModaleNouvelleCaution'

type Devis = {
  id: string
  numero: string
  statut: string
  source?: string
  tokenSignature?: string | null
  signatureClientDate?: string | null
  signatureClientIp?: string | null
  totalTtc: number
  tauxTva?: number
  dateEvenement: string | null
  dateCreation: string
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    email?: string | null
    telephone?: string | null
    statutApprobation?: 'VALIDE' | 'EN_ATTENTE'
  }
}

type Facture = {
  id: string
  numero: string
  statut: string
  montantTtc: number
  tauxTva?: number
  dateEcheance: string | null
  dateCreation: string
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    siret?: string | null
    type?: string | null
  }
  devis?: { numero: string }
}

type OngletActif = 'devis' | 'factures' | 'ia' | 'cautions'
type ModaleOuverte = null | 'ajout-devis'

export default function PageCommercial() {
  const [onglet, setOnglet] = useState<OngletActif>('devis')
  const [sousOngletDevis, setSousOngletDevis] = useState<'INTERNE' | 'WEB'>('INTERNE')
  const [devis, setDevis] = useState<Devis[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [cautions, setCautions] = useState<CautionComplete[]>([])
  const [rechercheCaution, setRechercheCaution] = useState('')
  const [statutFiltreCaution, setStatutFiltreCaution] = useState('TOUS')
  const [cautionEnGestion, setCautionEnGestion] = useState<CautionComplete | null>(null)
  const [modaleCautionOuverte, setModaleCautionOuverte] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [modale, setModale] = useState<ModaleOuverte>(null)
  const [devisAEditerId, setDevisAEditerId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [documentApercu, setDocumentApercu] = useState<{ titre: string; numero: string; urlPdf: string } | null>(null)

  const afficherToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const chargerDevis = useCallback(async () => {
    try {
      const rep = await fetch('/api/commercial/devis')
      const data = await rep.json()
      if (data.succes) setDevis(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const chargerFactures = useCallback(async () => {
    try {
      const rep = await fetch('/api/commercial/factures')
      const data = await rep.json()
      if (data.succes) setFactures(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const chargerCautions = useCallback(async () => {
    try {
      const rep = await fetch('/api/cautions')
      const data = await rep.json()
      if (data.succes) setCautions(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    setChargement(true)
    if (onglet === 'devis') chargerDevis().then(() => setChargement(false))
    else if (onglet === 'factures') chargerFactures().then(() => setChargement(false))
    else if (onglet === 'cautions') chargerCautions().then(() => setChargement(false))
    else setChargement(false)
  }, [onglet, chargerDevis, chargerFactures, chargerCautions])

  const changerStatutDevis = async (id: string, statut: string) => {
    try {
      await fetch(`/api/commercial/devis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut })
      })
      chargerDevis()
    } catch (err) {
      console.error(err)
    }
  }

  const approuverProspect = async (devisId: string) => {
    try {
      const rep = await fetch(`/api/commercial/devis/${devisId}/approuver`, {
        method: 'POST'
      })
      const data = await rep.json()
      if (data.succes) {
        afficherToast('✅ Prospect approuvé et devis basculé dans les devis internes !')
        chargerDevis()
        setSousOngletDevis('INTERNE')
      } else {
        alert(data.message || "Erreur lors de l'approbation du prospect")
      }
    } catch {
      alert('Erreur réseau lors de la validation')
    }
  }

  const refuserOuSupprimerDevis = async (devisId: string, numero: string) => {
    if (!confirm(`Voulez-vous vraiment écarter / supprimer définitivement la demande web ${numero} ?`)) {
      return
    }
    try {
      const rep = await fetch(`/api/commercial/devis/${devisId}`, {
        method: 'DELETE'
      })
      const data = await rep.json()
      if (data.succes) {
        afficherToast(`🗑️ Demande ${numero} écartée avec succès.`)
        chargerDevis()
      } else {
        alert(data.message || 'Impossible de supprimer cette demande')
      }
    } catch {
      alert('Erreur réseau lors de la suppression')
    }
  }

  const copierLienSignature = (token: string, numero: string) => {
    const url = `${window.location.origin}/devis/${token}`
    navigator.clipboard.writeText(url)
    afficherToast(`🔗 Lien de signature du devis ${numero} copié !`)
  }

  const convertirEnFacture = async (devisId: string) => {
    try {
      const rep = await fetch('/api/commercial/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId })
      })
      const data = await rep.json()
      if (data.succes) {
        alert('Facture créée avec succès !')
        chargerDevis()
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const payerFacture = async (id: string) => {
    try {
      await fetch(`/api/commercial/factures/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'PAYEE' })
      })
      chargerFactures()
    } catch (err) {
      console.error(err)
    }
  }

  // Filtrage Devis Internes vs Demandes Web
  const devisInternes = devis.filter(d => (d.source || 'INTERNE') === 'INTERNE')
  const devisWeb = devis.filter(d => d.source === 'WEB')
  const demandesWebEnAttente = devisWeb.filter(d => d.statut === 'BROUILLON').length

  const devisAffiches = sousOngletDevis === 'INTERNE' ? devisInternes : devisWeb

  // Stats Globales
  const devisEnAttenteTotal = devis.filter(d => d.statut === 'ENVOYE').length
  const devisValidesTotal = devis.filter(d => d.statut === 'VALIDE').length
  const caFacture = factures.reduce((sum, f) => sum + f.montantTtc, 0)
  const facturesNonPayees = factures.filter(f => f.statut === 'EMISE' || f.statut === 'EN_RETARD').length

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>💼</span>
            <h1>Commercial &amp; Facturation</h1>
          </div>
        </div>
        {onglet === 'cautions' ? (
          <button
            className={styles.boutonAjouter}
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 2px 10px rgba(20, 184, 166, 0.3)' }}
            onClick={() => setModaleCautionOuverte(true)}
          >
            + Enregistrer une caution
          </button>
        ) : (
          <button className={styles.boutonAjouter} onClick={() => setModale('ajout-devis')}>
            + Créer un devis
          </button>
        )}
      </header>

      <section className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Devis en attente</span>
            <span className={styles.carteStatIcone}>⏳</span>
          </div>
          <div className={styles.carteStatValeur}>{devisEnAttenteTotal}</div>
          <div className={styles.carteStatSous}>en attente de signature</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Devis validés</span>
            <span className={styles.carteStatIcone}>✅</span>
          </div>
          <div className={styles.carteStatValeur}>{devisValidesTotal}</div>
          <div className={styles.carteStatSous}>à facturer</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Chiffre d&apos;Affaires</span>
            <span className={styles.carteStatIcone}>💰</span>
          </div>
          <div className={styles.carteStatValeur} style={{ fontSize: 22 }}>{formaterPrix(caFacture)}</div>
          <div className={styles.carteStatSous}>facturé ce mois (hors cautions)</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Factures impayées</span>
            <span className={styles.carteStatIcone}>⚠️</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: facturesNonPayees > 0 ? '#f87171' : '#34d399' }}>
            {facturesNonPayees}
          </div>
          <div className={styles.carteStatSous}>factures en attente</div>
        </div>
      </section>

      <div className={styles.onglets}>
        <button
          className={`${styles.onglet} ${onglet === 'devis' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('devis')}
        >
          <span className={styles.ongletEmoji}>📝</span> Devis ({devis.length})
          {demandesWebEnAttente > 0 && (
            <span className={styles.pastilleWeb} title={`${demandesWebEnAttente} demande(s) web à traiter`}>
              {demandesWebEnAttente}
            </span>
          )}
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'factures' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('factures')}
        >
          <span className={styles.ongletEmoji}>🧾</span> Factures ({factures.length})
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'cautions' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('cautions')}
        >
          <span className={styles.ongletEmoji}>🛡️</span> Cautions ({cautions.length})
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'ia' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('ia')}
        >
          <span className={styles.ongletEmoji}>✨</span> Brouillons IA
        </button>
      </div>

      {chargement ? (
        <div className={styles.etatVide}><p>⏳</p><h3>Chargement…</h3></div>
      ) : onglet === 'devis' ? (
        <div>
          {/* Sous-onglets de séparation Devis Internes / Demandes Web */}
          <div className={styles.barreSousOnglets}>
            <div className={styles.sousOnglets}>
              <button
                className={`${styles.sousOnglet} ${sousOngletDevis === 'INTERNE' ? styles.sousOngletActif : ''}`}
                onClick={() => setSousOngletDevis('INTERNE')}
              >
                <span>🏢</span> Devis Internes ({devisInternes.length})
              </button>
              <button
                className={`${styles.sousOnglet} ${sousOngletDevis === 'WEB' ? styles.sousOngletActif : ''}`}
                onClick={() => setSousOngletDevis('WEB')}
              >
                <span>🌐</span> Demandes Web ({devisWeb.length})
                {demandesWebEnAttente > 0 && (
                  <span className={styles.pastilleWeb}>{demandesWebEnAttente}</span>
                )}
              </button>
            </div>

            {sousOngletDevis === 'WEB' && demandesWebEnAttente > 0 && (
              <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                🔔 {demandesWebEnAttente} nouvelle(s) demande(s) issue(s) du site vitrine / chatbot à qualifier
              </span>
            )}
          </div>

          <TableauDevis
            mode={sousOngletDevis}
            devis={devisAffiches}
            onChangerStatut={changerStatutDevis}
            onConvertir={convertirEnFacture}
            onEditer={id => setDevisAEditerId(id)}
            onApprouverProspect={approuverProspect}
            onRefuserSupprimer={refuserOuSupprimerDevis}
            onCopierLien={copierLienSignature}
            onApercuPdf={d => setDocumentApercu({ titre: 'Devis', numero: d.numero, urlPdf: `/api/commercial/devis/${d.id}/pdf` })}
          />
        </div>
      ) : onglet === 'factures' ? (
        <TableauFactures
          factures={factures}
          onPayer={payerFacture}
          onApercuPdf={f => setDocumentApercu({ titre: 'Facture', numero: f.numero, urlPdf: `/api/commercial/factures/${f.id}/pdf` })}
        />
      ) : onglet === 'cautions' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 16px', background: 'rgba(20, 184, 166, 0.08)', borderRadius: 10, border: '1px solid rgba(20, 184, 166, 0.2)' }}>
            <span style={{ fontSize: 13, color: '#99f6e4' }}>
              🔒 <strong>Séparation Comptable :</strong> Les cautions sont strictement isolées du chiffre d&apos;affaires (hors CA).
            </span>
            <Link
              href="/cautions"
              style={{ fontSize: 12.5, color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}
            >
              Ouvrir l&apos;espace complet Cautions ↗
            </Link>
          </div>
          <TableauCautions
            cautions={cautions}
            recherche={rechercheCaution}
            onChangerRecherche={setRechercheCaution}
            statutFiltre={statutFiltreCaution}
            onChangerStatutFiltre={setStatutFiltreCaution}
            onGerer={c => setCautionEnGestion(c)}
            onApercuPdf={id => {
              const c = cautions.find(item => item.id === id)
              const num = c ? `CAU-${c.id.slice(-6).toUpperCase()}` : 'Caution'
              setDocumentApercu({
                titre: 'Attestation de Caution',
                numero: num,
                urlPdf: `/api/cautions/${id}/pdf`
              })
            }}
          />
        </div>
      ) : (
        <BrouillonsIA
          onDevisCree={() => {
            chargerDevis()
            setOnglet('devis')
          }}
        />
      )}

      {/* Modale de création ou édition de devis */}
      {(modale === 'ajout-devis' || devisAEditerId !== null) && (
        <ModaleDevis
          devisIdEditer={devisAEditerId}
          onFermer={() => {
            setModale(null)
            setDevisAEditerId(null)
          }}
          onSucces={() => {
            setModale(null)
            setDevisAEditerId(null)
            chargerDevis()
          }}
        />
      )}

      {modaleCautionOuverte && (
        <ModaleNouvelleCaution
          onFermer={() => setModaleCautionOuverte(false)}
          onCree={() => chargerCautions()}
        />
      )}

      {cautionEnGestion && (
        <ModaleGestionCaution
          caution={cautionEnGestion}
          onFermer={() => setCautionEnGestion(null)}
          onSauvegarder={() => chargerCautions()}
          onOuvrirPdf={id => {
            const num = `CAU-${cautionEnGestion.id.slice(-6).toUpperCase()}`
            setDocumentApercu({
              titre: 'Attestation de Caution',
              numero: num,
              urlPdf: `/api/cautions/${id}/pdf`
            })
          }}
        />
      )}

      {documentApercu && (
        <ModaleApercuPdf
          titre={documentApercu.titre}
          numero={documentApercu.numero}
          urlPdf={documentApercu.urlPdf}
          onFermer={() => setDocumentApercu(null)}
        />
      )}

      {/* Toast de confirmation */}
      {toastMessage && (
        <div className={styles.toastCopie}>
          {toastMessage}
        </div>
      )}
    </main>
  )
}

function TableauDevis({
  mode,
  devis,
  onChangerStatut,
  onConvertir,
  onEditer,
  onApprouverProspect,
  onRefuserSupprimer,
  onCopierLien,
  onApercuPdf
}: {
  mode: 'INTERNE' | 'WEB'
  devis: Devis[]
  onChangerStatut: (id: string, st: string) => void
  onConvertir: (id: string) => void
  onEditer: (id: string) => void
  onApprouverProspect: (id: string) => void
  onRefuserSupprimer: (id: string, numero: string) => void
  onCopierLien: (token: string, numero: string) => void
  onApercuPdf: (d: Devis) => void
}) {
  if (devis.length === 0) {
    return mode === 'WEB' ? (
      <div className={styles.etatVide}>
        <p>🌐</p>
        <h3>Aucune demande web</h3>
        <span>Toutes les demandes issues de la vitrine et du chatbot ont été traitées</span>
      </div>
    ) : (
      <div className={styles.etatVide}>
        <p>📝</p>
        <h3>Aucun devis interne</h3>
        <span>Créez votre premier devis interne ou approuvez une demande issue du web</span>
      </div>
    )
  }

  const badgeClass = (st: string) => {
    if (st === 'BROUILLON') return styles.badgeBrouillon
    if (st === 'ENVOYE') return styles.badgeEnvoye
    if (st === 'VALIDE') return styles.badgeValide
    if (st === 'REFUSE') return styles.badgeRefuse
    if (st === 'FACTURE') return styles.badgeFacture
    return styles.badgeBrouillon
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>N° Devis</th>
            <th>Client &amp; Contact</th>
            <th>Date Création</th>
            <th>Total TTC</th>
            <th>{mode === 'WEB' ? 'État Demande' : 'Statut'}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devis.map(d => {
            const nomClient = d.client.prenom ? `${d.client.prenom} ${d.client.nom}` : d.client.nom
            const estSigneEnLigne = d.statut === 'VALIDE' || Boolean(d.signatureClientDate)
            const estATraiter = d.statut === 'BROUILLON'
            const estArchive = d.statut === 'REFUSE'
            const prospectEnAttente = d.client.statutApprobation === 'EN_ATTENTE'

            return (
              <tr key={d.id}>
                <td className={styles.celluleNum}>
                  <div>{d.numero}</div>
                  {mode === 'WEB' && (
                    <span style={{ fontSize: 10.5, color: '#38bdf8', fontWeight: 600 }}>
                      🌐 Vitrine Web
                    </span>
                  )}
                </td>

                <td className={styles.celluleClient}>
                  <div style={{ fontWeight: 600 }}>
                    {nomClient} {d.client.entreprise ? `(${d.client.entreprise})` : ''}
                  </div>
                  {d.client.telephone && (
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                      📞 {d.client.telephone}
                    </div>
                  )}
                  {d.client.email && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ✉️ {d.client.email}
                    </div>
                  )}

                  {/* Badge d'approbation du prospect si issu du web */}
                  {mode === 'WEB' && (
                    prospectEnAttente ? (
                      <span className={styles.badgeProspectEnAttente} title="Prospect en attente d'évaluation commerciale">
                        ⏳ Prospect à valider
                      </span>
                    ) : (
                      <span className={styles.badgeClientValide} title="Prospect vérifié et rattaché au fichier client">
                        ✅ Client approuvé
                      </span>
                    )
                  )}
                </td>

                <td>{formaterDate(d.dateCreation)}</td>

                <td className={styles.montant}>
                  <div>{formaterPrix(d.totalTtc)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                    {d.tauxTva === 0
                      ? 'TVA 0% (art. 293 B)'
                      : `TVA (${(d.tauxTva ?? 8.5).toString().replace('.', ',')}%)`}
                  </div>
                </td>

                <td>
                  {mode === 'WEB' ? (
                    estSigneEnLigne ? (
                      <span className={styles.badgeWebSigne} title="Devis signé électroniquement par le client">
                        ✍️ Signé en ligne
                      </span>
                    ) : estATraiter ? (
                      <span className={styles.badgeWebATraiter} title="Nouvelle demande web en attente de traitement commercial">
                        ⏳ À traiter
                      </span>
                    ) : estArchive ? (
                      <span className={styles.badgeWebArchive} title="Demande sans suite">
                        📁 Sans suite
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${badgeClass(d.statut)}`}>{d.statut}</span>
                    )
                  ) : (
                    <span className={`${styles.badge} ${badgeClass(d.statut)}`}>{d.statut}</span>
                  )}
                </td>

                <td>
                  <div className={styles.actionsCell}>
                    {/* Bouton d'approbation directe du prospect et bascule en interne */}
                    {mode === 'WEB' && prospectEnAttente && (
                      <button
                        type="button"
                        className={styles.boutonApprouver}
                        onClick={() => onApprouverProspect(d.id)}
                        title="Valider le client et basculer cette demande dans les devis internes"
                      >
                        ✅ Approuver &amp; Basculer
                      </button>
                    )}

                    {/* Bouton pour rejeter / supprimer les fausses demandes web */}
                    {mode === 'WEB' && (
                      <button
                        type="button"
                        className={styles.boutonRejeter}
                        onClick={() => onRefuserSupprimer(d.id, d.numero)}
                        title="Écarter ou supprimer cette demande web"
                      >
                        🗑️ Refuser
                      </button>
                    )}

                    {/* Lien de signature en ligne */}
                    {d.tokenSignature && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className={styles.boutonLienSignature}
                          onClick={() => onCopierLien(d.tokenSignature!, d.numero)}
                          title="Copier le lien direct de consultation et signature tactile (/devis/[token])"
                        >
                          🔗 Lien signature
                        </button>
                        <a
                          href={`/devis/${d.tokenSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.boutonAction}
                          title="Ouvrir la page de signature client dans un nouvel onglet"
                        >
                          ↗️
                        </a>
                      </div>
                    )}

                    {/* Modification via ModaleDevis */}
                    <button
                      type="button"
                      className={styles.boutonAction}
                      onClick={() => onEditer(d.id)}
                      title="Modifier les prestations, dates et tarifs dans l'éditeur de devis"
                    >
                      ✏️
                    </button>

                    {/* Action Aperçu PDF */}
                    <button
                      type="button"
                      className={styles.boutonAction}
                      onClick={() => onApercuPdf(d)}
                      title="Aperçu du PDF officiel"
                    >
                      👁️
                    </button>

                    {/* Action Télécharger PDF */}
                    <a
                      href={`/api/commercial/devis/${d.id}/pdf?download=1`}
                      download={`${d.numero}.pdf`}
                      className={styles.boutonPdfTableau}
                      title="Télécharger le document PDF"
                    >
                      📄 PDF
                    </a>

                    {/* Actions de workflow standard pour devis internes */}
                    {mode === 'INTERNE' && d.statut === 'BROUILLON' && (
                      <button
                        className={styles.boutonAction}
                        onClick={() => onChangerStatut(d.id, 'ENVOYE')}
                        title="Marquer envoyé"
                      >
                        📨
                      </button>
                    )}
                    {mode === 'INTERNE' && d.statut === 'ENVOYE' && (
                      <>
                        <button
                          className={styles.boutonAction}
                          onClick={() => onChangerStatut(d.id, 'VALIDE')}
                          title="Valider le devis"
                        >
                          ✅
                        </button>
                        <button
                          className={styles.boutonAction}
                          onClick={() => onChangerStatut(d.id, 'REFUSE')}
                          title="Marquer refusé"
                        >
                          ❌
                        </button>
                      </>
                    )}
                    {d.statut === 'VALIDE' && (
                      <button
                        className={styles.boutonConvertir}
                        onClick={() => onConvertir(d.id)}
                        title="Transformer ce devis validé en facture officielle"
                      >
                        🧾 Facturer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TableauFactures({
  factures,
  onPayer,
  onApercuPdf
}: {
  factures: Facture[]
  onPayer: (id: string) => void
  onApercuPdf: (f: Facture) => void
}) {
  if (factures.length === 0) {
    return (
      <div className={styles.etatVide}>
        <p>🧾</p>
        <h3>Aucune facture</h3>
        <span>Transformez un devis validé en facture</span>
      </div>
    )
  }

  const badgeClass = (st: string) => {
    if (st === 'EMISE') return styles.badgeEmise
    if (st === 'PAYEE') return styles.badgePayee
    if (st === 'EN_RETARD') return styles.badgeRetard
    if (st === 'ANNULEE') return styles.badgeAnnulee
    return styles.badgeEmise
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>N° Facture</th>
            <th>Liée à</th>
            <th>Client</th>
            <th>Total TTC</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {factures.map(f => {
            const estFacturX = !!f.client.siret || !!f.client.entreprise || f.client.type === 'PROFESSIONNEL'
            return (
              <tr key={f.id}>
                <td className={styles.celluleNum}>{f.numero}</td>
                <td style={{ fontSize: 12, color: '#94a3b8' }}>{f.devis?.numero || '—'}</td>
                <td className={styles.celluleClient}>
                  <div>
                    {f.client.prenom ? `${f.client.prenom} ${f.client.nom}` : f.client.nom}
                    {f.client.entreprise && ` (${f.client.entreprise})`}
                  </div>
                  {f.client.siret && (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 1 }}>
                      SIRET : {f.client.siret}
                    </div>
                  )}
                  {estFacturX && (
                    <span className={styles.badgeFacturX} title="Facture électronique conforme Factur-X / CII EN 16931 (PDF/A-3)">
                      ⚡ Factur-X
                    </span>
                  )}
                </td>
                <td className={styles.montant}>
                  <div>{formaterPrix(f.montantTtc)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                    {f.tauxTva === 0
                      ? 'TVA 0% (art. 293 B)'
                      : `TVA (${(f.tauxTva ?? 8.5).toString().replace('.', ',')}%)`}
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${badgeClass(f.statut)}`}>{f.statut}</span>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    {/* Action Aperçu PDF */}
                    <button
                      type="button"
                      className={styles.boutonAction}
                      onClick={() => onApercuPdf(f)}
                      title="Aperçu du PDF officiel Factur-X"
                    >
                      👁️
                    </button>

                    {/* Action Télécharger PDF */}
                    <a
                      href={`/api/commercial/factures/${f.id}/pdf?download=1`}
                      download={`${f.numero}.pdf`}
                      className={styles.boutonPdfTableau}
                      title="Télécharger la facture en PDF/A-3 (avec factur-x.xml)"
                    >
                      📄 PDF
                    </a>

                    {/* Action Télécharger XML Factur-X */}
                    <a
                      href={`/api/commercial/factures/${f.id}/pdf?xml=1`}
                      download={`factur-x-${f.numero}.xml`}
                      className={styles.boutonXmlFacturx}
                      title="Télécharger le flux XML Factur-X brut pour Chorus Pro / PDP"
                    >
                      📥 XML
                    </a>

                    {f.statut === 'EMISE' && (
                      <button className={styles.boutonConvertir} onClick={() => onPayer(f.id)}>
                        💰 Marquer Payée
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
