'use client'

import React, { useState } from 'react'
import styles from '../cautions.module.css'
import { formaterPrix, formaterDate } from '@/lib/utilitaires'
import type { CautionComplete } from './ModaleGestionCaution'

interface TableauCautionsProps {
  cautions: CautionComplete[]
  recherche: string
  onChangerRecherche: (r: string) => void
  statutFiltre: string
  onChangerStatutFiltre: (s: string) => void
  onGerer: (caution: CautionComplete) => void
  onApercuPdf: (cautionId: string) => void
}

export function TableauCautions({
  cautions,
  recherche,
  onChangerRecherche,
  statutFiltre,
  onChangerStatutFiltre,
  onGerer,
  onApercuPdf
}: TableauCautionsProps) {
  const getBadgeStatut = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_DEPOT':
      case 'EN_ATTENTE':
        return <span className={`${styles.badgeStatut} ${styles.statutEnAttente}`}>⏳ En attente de dépôt</span>
      case 'RECU_NON_ENCAISSE':
        return <span className={`${styles.badgeStatut} ${styles.statutRecu}`}>🔒 Sécurisée / Coffre</span>
      case 'RESTITUE':
      case 'RESTITUEE':
        return <span className={`${styles.badgeStatut} ${styles.statutRestitue}`}>✅ Restituée</span>
      case 'ENCAISSE_PARTIEL':
        return <span className={`${styles.badgeStatut} ${styles.statutEncaissePartiel}`}>⚠️ Retenue partielle</span>
      case 'ENCAISSE_TOTAL':
      case 'ENCAISSEE':
        return <span className={`${styles.badgeStatut} ${styles.statutEncaisseTotal}`}>🛑 Encaissée totale</span>
      default:
        return <span className={styles.badgeStatut}>{statut}</span>
    }
  }

  const getLabelType = (type: string) => {
    switch (type) {
      case 'CHEQUE': return '📄 Chèque'
      case 'CB_EMPREINTE': return '💳 Empreinte CB'
      case 'ESPECES': return '💵 Espèces'
      case 'VIREMENT': return '🏦 Virement'
      default: return type
    }
  }

  const filtres = [
    { id: 'TOUS', label: 'Toutes' },
    { id: 'RECU_NON_ENCAISSE', label: '🔒 Sécurisées' },
    { id: 'EN_ATTENTE_DEPOT', label: '⏳ En attente' },
    { id: 'RESTITUE', label: '✅ Restituées' },
    { id: 'ENCAISSE_PARTIEL', label: '⚠️ Retenues' },
    { id: 'ENCAISSE_TOTAL', label: '🛑 Encaissées' },
  ]

  return (
    <div>
      {/* Barre de recherche et filtres */}
      <div className={styles.barreFiltres}>
        <div className={styles.champRecherche}>
          <span className={styles.iconeRecherche}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher par client, entreprise, n° devis, référence chèque..."
            value={recherche}
            onChange={e => onChangerRecherche(e.target.value)}
          />
        </div>

        <div className={styles.filtresStatuts}>
          {filtres.map(f => (
            <button
              key={f.id}
              className={`${styles.boutonFiltre} ${statutFiltre === f.id ? styles.boutonFiltreActif : ''}`}
              onClick={() => onChangerStatutFiltre(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className={styles.sectionTableau}>
        {cautions.length === 0 ? (
          <div className={styles.etatVide}>
            <div className={styles.etatVideIcone}>🛡️</div>
            <h3>Aucun dossier de caution trouvé</h3>
            <p>Ajustez vos filtres ou enregistrez un nouveau dépôt de garantie.</p>
          </div>
        ) : (
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th>Client / Déposant</th>
                <th>Dossier / Événement</th>
                <th>Montant Caution</th>
                <th>Règlement</th>
                <th>Statut</th>
                <th>Décompte Restitution</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cautions.map(caution => {
                const aCasse = caution.declarationsCasse.length > 0
                return (
                  <tr key={caution.id} className={styles.ligneTableau}>
                    {/* Client */}
                    <td>
                      <div className={styles.clientCell}>
                        <span className={styles.nomClient}>
                          {caution.client.entreprise || `${caution.client.prenom ? caution.client.prenom + ' ' : ''}${caution.client.nom}`}
                        </span>
                        <span className={styles.sousClient}>
                          📞 {caution.client.telephone}
                          {caution.client.ville && ` • ${caution.client.ville}`}
                        </span>
                      </div>
                    </td>

                    {/* Dossier / Événement */}
                    <td>
                      {caution.devis ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{caution.devis.numero}</div>
                          {caution.devis.dateEvenement && (
                            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                              📅 {formaterDate(caution.devis.dateEvenement)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 12 }}>Caution libre</span>
                      )}
                    </td>

                    {/* Montant Initial */}
                    <td>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Outfit', color: '#f8fafc' }}>
                        {formaterPrix(caution.montant)}
                      </span>
                    </td>

                    {/* Mode & Référence */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className={styles.badgeMode}>{getLabelType(caution.type)}</span>
                        {caution.reference && (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {caution.reference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Statut & Alerte Casse */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {getBadgeStatut(caution.statut)}
                        {aCasse && caution.statut !== 'RESTITUE' && caution.statut !== 'ENCAISSE_TOTAL' && (
                          <span className={styles.pastilleCasse} title="Déclarations de casse en atelier non soldées">
                            ⚠️ {caution.declarationsCasse.length} casse(s) atelier
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Décompte Restitution */}
                    <td>
                      {caution.statut === 'RESTITUE' ? (
                        <span style={{ color: '#34d399', fontWeight: 600, fontSize: 13 }}>
                          Restitué : {formaterPrix(caution.montantRestitue ?? caution.montant)}
                        </span>
                      ) : caution.statut === 'ENCAISSE_PARTIEL' ? (
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>
                            Retenue : -{formaterPrix(caution.montantRetenu)}
                          </span>
                          <div style={{ color: '#34d399' }}>
                            Restitué : {formaterPrix(caution.montantRestitue ?? (caution.montant - caution.montantRetenu))}
                          </div>
                        </div>
                      ) : caution.statut === 'ENCAISSE_TOTAL' ? (
                        <span style={{ color: '#f87171', fontWeight: 600, fontSize: 12 }}>
                          Conservé : {formaterPrix(caution.montant)}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 12 }}>Non clôturée</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.boutonGerer}
                          onClick={() => onGerer(caution)}
                          title="Gérer la restitution, litiges et retenues"
                        >
                          ⚙️ Gérer
                        </button>
                        <button
                          type="button"
                          className={styles.boutonPdf}
                          onClick={() => onApercuPdf(caution.id)}
                          title="Télécharger l'attestation PDF"
                        >
                          📄 PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
