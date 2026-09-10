'use client'

import Link from 'next/link'
import styles from '../planning.module.css'
import { formaterDate, formaterPrix } from '@/lib/utilitaires'

export interface ArticleDetailPlanning {
  id: string
  articleId: string | null
  designation: string
  quantite: number
  prixUnitaire: number
  totalLigne: number
  article?: {
    id: string
    nom: string
    reference: string
    quantiteTotale: number
    quantiteDisponible: number
    categorie?: {
      id: string
      nom: string
      type: string
      icone?: string | null
    } | null
  } | null
}

export interface EvenementPlanning {
  id: string
  numero: string
  dateEvenement: string
  dateDebut: string
  dateFin: string
  dureeLocation: number
  lieuEvenement: string
  typeEvenement: string
  statut: string
  totalTtc: number
  tauxTva: number
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    telephone: string | null
    email: string | null
    ville: string | null
  }
  lignes: ArticleDetailPlanning[]
  categories: string[]
  tension: 'NORMAL' | 'CRITIQUE' | 'SURRESERVATION'
  articlesEnTension: Array<{
    articleId: string
    nom: string
    reference: string
    quantiteDemandee: number
    quantiteTotaleParc: number
    chargeMaxJour: number
    pourcentageCharge: number
    etat: 'CRITIQUE' | 'SURRESERVATION'
  }>
}

interface PropsModaleDetailPlanning {
  evenement: EvenementPlanning
  onFermer: () => void
}

export function ModaleDetailPlanning({ evenement, onFermer }: PropsModaleDetailPlanning) {
  const clientNom = `${evenement.client.prenom ? `${evenement.client.prenom} ` : ''}${evenement.client.nom}`

  const badgeTensionTexte = () => {
    if (evenement.tension === 'SURRESERVATION') return '🚨 Sur-réservation / Overbooking détecté'
    if (evenement.tension === 'CRITIQUE') return '⚠️ Tension critique sur le stock (> 75%)'
    return '✅ Stock disponible et sécurisé'
  }

  const badgeTensionClasse = () => {
    if (evenement.tension === 'SURRESERVATION') return styles.tensionSurreservation
    if (evenement.tension === 'CRITIQUE') return styles.tensionCritique
    return styles.tensionNormal
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={e => e.stopPropagation()}>
        {/* Entête */}
        <div className={styles.modaleEntete}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>📅</span>
              <h2 style={{ fontSize: 20, margin: 0, color: '#f1f5f9' }}>
                Événement {evenement.numero}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fcd34d',
                  fontWeight: 700
                }}
              >
                {evenement.statut}
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {evenement.typeEvenement} à {evenement.lieuEvenement}
            </span>
          </div>

          <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">
            ✕
          </button>
        </div>

        {/* Bandeau de tension */}
        <div className={`${styles.bannerTensionAlerte} ${badgeTensionClasse()}`}>
          <span>{badgeTensionTexte()}</span>
        </div>

        {/* Alerte overbooking détaillée */}
        {evenement.articlesEnTension.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: evenement.tension === 'SURRESERVATION' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${evenement.tension === 'SURRESERVATION' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              marginBottom: 16,
              fontSize: 12
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#f1f5f9' }}>
              Articles en tension sur cette période :
            </div>
            {evenement.articlesEnTension.map(art => (
              <div key={art.articleId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>
                  • <strong>{art.nom}</strong> ({art.reference}) : demande de {art.quantiteDemandee} pcs
                </span>
                <span style={{ fontWeight: 700, color: art.etat === 'SURRESERVATION' ? '#ef4444' : '#f59e0b' }}>
                  {art.chargeMaxJour} / {art.quantiteTotaleParc} en parc ({art.pourcentageCharge}%)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Grille informations Client & Dates */}
        <div className={styles.grilleInfosEvenement}>
          <div className={styles.blocInfoEvenement}>
            <div className={styles.blocInfoTitre}>👤 Client &amp; Contact</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
              {clientNom}
            </div>
            {evenement.client.entreprise && (
              <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 2 }}>
                🏢 Société : {evenement.client.entreprise}
              </div>
            )}
            {evenement.client.telephone && (
              <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 2 }}>
                📞 Tél : {evenement.client.telephone}
              </div>
            )}
            {evenement.client.email && (
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                ✉️ Email : {evenement.client.email}
              </div>
            )}
          </div>

          <div className={styles.blocInfoEvenement}>
            <div className={styles.blocInfoTitre}>📍 Détails de la Réservation</div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>
              <strong>Date de départ : </strong>
              {formaterDate(evenement.dateDebut)}
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>
              <strong>Date de restitution : </strong>
              {formaterDate(evenement.dateFin)} ({evenement.dureeLocation} jour(s))
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>
              <strong>Lieu : </strong> {evenement.lieuEvenement}
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              <strong>Montant Devis : </strong>
              <span style={{ color: '#C9A84C', fontWeight: 700 }}>
                {formaterPrix(evenement.totalTtc)}
              </span>
            </div>
          </div>
        </div>

        {/* Tableau du matériel réservé */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>
            📦 Matériel réservé ({evenement.lignes.length} article(s))
          </div>

          <table className={styles.tableauMateriel}>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Catégorie</th>
                <th style={{ textAlign: 'center' }}>Qté Réservée</th>
                <th style={{ textAlign: 'right' }}>Parc Total</th>
                <th>Tension Stock</th>
              </tr>
            </thead>
            <tbody>
              {evenement.lignes.map(l => {
                const totalParc = l.article?.quantiteTotale || 0
                const ratio = totalParc > 0 ? l.quantite / totalParc : 0
                const pct = Math.min(100, Math.round(ratio * 100))
                const couleurBarometre = ratio > 1 ? '#ef4444' : ratio >= 0.75 ? '#f59e0b' : '#10b981'

                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.designation}</strong>
                      {l.article?.reference && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.article.reference}</div>
                      )}
                    </td>
                    <td>{l.article?.categorie?.nom || 'Général'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{l.quantite}</td>
                    <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                      {totalParc > 0 ? `${totalParc} pcs` : '—'}
                    </td>
                    <td style={{ width: 140 }}>
                      <div style={{ fontSize: 11, color: couleurBarometre, fontWeight: 600 }}>
                        {ratio > 1 ? `Sur-réservé (${pct}%)` : `${pct}% utilisé`}
                      </div>
                      <div className={styles.barometreStock}>
                        <div
                          className={styles.barometreRempli}
                          style={{ width: `${pct}%`, backgroundColor: couleurBarometre }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Actions rapides */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <Link
            href={`/commercial`}
            style={{
              fontSize: 13,
              color: '#fcd34d',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            💼 Ouvrir dans le module Commercial
          </Link>

          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`/api/commercial/devis/${evenement.id}/pdf?download=1`}
              download={`${evenement.numero}.pdf`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #B8922A, #d97706)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                textDecoration: 'none'
              }}
            >
              📄 Télécharger Devis PDF
            </a>

            <button
              type="button"
              className={styles.boutonNavDate}
              onClick={onFermer}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
