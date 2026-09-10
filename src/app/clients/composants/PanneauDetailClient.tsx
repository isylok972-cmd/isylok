'use client'

import { useState } from 'react'
import styles from '../clients.module.css'
import { formaterPrix, formaterDate } from '@/lib/utilitaires'
import type { ClientComplet } from '../page'

interface PropsPanneauDetail {
  client: ClientComplet
  onFermer: () => void
  onModifier: () => void
  onAjouterCaution: () => void
  onRecharger: () => void
  onValiderProspect?: () => void
}

const LABELS_TYPE_CAUTION: Record<string, string> = {
  CHEQUE: '📝 Chèque', ESPECES: '💵 Espèces', VIREMENT: '🏦 Virement', CB: '💳 CB',
}

const LABELS_STATUT_CAUTION: Record<string, string> = {
  EN_ATTENTE: 'En attente', ENCAISSEE: 'Encaissée', RESTITUEE: 'Restituée',
}

export function PanneauDetailClient({ client, onFermer, onModifier, onAjouterCaution, onRecharger, onValiderProspect }: PropsPanneauDetail) {
  const [chargementCaution, setChargementCaution] = useState<string | null>(null)

  const initiales = `${(client.prenom || client.nom)?.[0] || ''}${client.nom?.[0] || ''}`.toUpperCase()
  const couleurAvatar = client.type === 'PROFESSIONNEL'
    ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
    : 'linear-gradient(135deg, #ec4899, #f472b6)'

  const totalCautions = client.cautions?.reduce((s, c) => s + c.montant, 0) || 0
  const cautionsEnAttente = client.cautions?.filter(c => c.statut === 'EN_ATTENTE') || []

  const changerStatutCaution = async (cautionId: string, nouveauStatut: string) => {
    setChargementCaution(cautionId)
    try {
      const rep = await fetch('/api/clients/cautions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cautionId, statut: nouveauStatut }),
      })
      const data = await rep.json()
      if (data.succes) onRecharger()
    } catch (err) { console.error(err) }
    finally { setChargementCaution(null) }
  }

  return (
    <>
      <div className={styles.panneauOverlay} onClick={onFermer} />
      <div className={styles.panneauDetail}>
        <div className={styles.panneauEntete}>
          <div className={styles.panneauClientInfo}>
            <div className={styles.panneauAvatar} style={{ background: couleurAvatar }}>{initiales}</div>
            <div>
              <div className={styles.panneauNom}>{client.prenom ? `${client.prenom} ${client.nom}` : client.nom}</div>
              <div className={styles.panneauType}>
                {client.type === 'PROFESSIONNEL' ? `🏢 ${client.entreprise || 'Professionnel'}` : '👤 Particulier'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.boutonAction} onClick={onModifier} title="Modifier">✏️</button>
            <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
          </div>
        </div>

        {client.statutApprobation === 'EN_ATTENTE' && (
          <div style={{
            margin: '0 0 20px 0',
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13 }}>⚠️ Nouveau Prospect Web</div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>Contact collecté via la vitrine / le chatbot</div>
            </div>
            {onValiderProspect && (
              <button
                type="button"
                className={styles.boutonValiderProspect}
                onClick={onValiderProspect}
                title="Valider ce prospect et le transférer dans les clients officiels"
              >
                ✅ Valider le client
              </button>
            )}
          </div>
        )}

        {/* Coordonnées */}
        <div className={styles.panneauSection}>
          <div className={styles.panneauSectionTitre}>📞 Coordonnées</div>
          <div className={styles.panneauChamp}>
            <span className={styles.panneauChampLabel}>Téléphone</span>
            <span className={styles.panneauChampValeur}>{client.telephone}</span>
          </div>
          {client.telephoneSecondaire && (
            <div className={styles.panneauChamp}>
              <span className={styles.panneauChampLabel}>Tél. secondaire</span>
              <span className={styles.panneauChampValeur}>{client.telephoneSecondaire}</span>
            </div>
          )}
          {client.email && (
            <div className={styles.panneauChamp}>
              <span className={styles.panneauChampLabel}>Email</span>
              <span className={styles.panneauChampValeur}>{client.email}</span>
            </div>
          )}
          {client.adresse && (
            <div className={styles.panneauChamp}>
              <span className={styles.panneauChampLabel}>Adresse</span>
              <span className={styles.panneauChampValeur}>{client.adresse}{client.codePostal ? `, ${client.codePostal}` : ''}{client.ville ? ` ${client.ville}` : ''}</span>
            </div>
          )}
          {client.siret && (
            <div className={styles.panneauChamp}>
              <span className={styles.panneauChampLabel}>SIRET</span>
              <span className={styles.panneauChampValeur}>{client.siret}</span>
            </div>
          )}
        </div>

        {/* Cautions */}
        <div className={styles.panneauSection}>
          <div className={styles.panneauSectionTitre}>
            🔒 Cautions
            {totalCautions > 0 && <span className={styles.badge + ' ' + styles.badgeEnAttente}>{formaterPrix(totalCautions)}</span>}
          </div>

          {client.cautions && client.cautions.length > 0 ? (
            client.cautions.map(caution => (
              <div key={caution.id} className={styles.cautionCarte}>
                <div className={styles.cautionCarteEntete}>
                  <span className={styles.cautionMontant}>{formaterPrix(caution.montant)}</span>
                  <span className={`${styles.badge} ${caution.statut === 'EN_ATTENTE' ? styles.badgeEnAttente : caution.statut === 'ENCAISSEE' ? styles.badgeEncaissee : styles.badgeRestituee}`}>
                    {LABELS_STATUT_CAUTION[caution.statut]}
                  </span>
                </div>
                <div className={styles.cautionDetails}>
                  <span>{LABELS_TYPE_CAUTION[caution.type]}</span>
                  {caution.reference && <span>Réf: {caution.reference}</span>}
                  <span>{formaterDate(caution.dateCreation)}</span>
                </div>
                {caution.statut === 'EN_ATTENTE' && (
                  <div className={styles.cautionActions}>
                    <button
                      className={`${styles.boutonCautionAction} ${styles.boutonEncaisser}`}
                      onClick={() => changerStatutCaution(caution.id, 'ENCAISSEE')}
                      disabled={chargementCaution === caution.id}
                    >
                      {chargementCaution === caution.id ? '⏳' : '💰 Encaisser'}
                    </button>
                    <button
                      className={`${styles.boutonCautionAction} ${styles.boutonRestituer}`}
                      onClick={() => changerStatutCaution(caution.id, 'RESTITUEE')}
                      disabled={chargementCaution === caution.id}
                    >
                      {chargementCaution === caution.id ? '⏳' : '↩️ Restituer'}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: '#64748b', fontSize: 13 }}>Aucune caution enregistrée</p>
          )}

          <button className={styles.boutonAjouterCaution} onClick={onAjouterCaution}>
            + Ajouter une caution
          </button>
        </div>

        {/* Devis récents */}
        {client.devis && client.devis.length > 0 && (
          <div className={styles.panneauSection}>
            <div className={styles.panneauSectionTitre}>📋 Derniers devis</div>
            {client.devis.map(devis => (
              <div key={devis.id} className={styles.panneauChamp}>
                <span className={styles.panneauChampLabel}>{devis.numero}</span>
                <span className={styles.panneauChampValeur}>{formaterPrix(devis.totalTtc)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {client.notes && (
          <div className={styles.panneauSection}>
            <div className={styles.panneauSectionTitre}>📝 Notes</div>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{client.notes}</p>
          </div>
        )}

        {/* Info date */}
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 16 }}>
          Client depuis le {formaterDate(client.dateCreation)}
          {cautionsEnAttente.length > 0 && (
            <span style={{ display: 'block', color: '#fbbf24', marginTop: 4 }}>
              ⚠️ {cautionsEnAttente.length} caution{cautionsEnAttente.length > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>
      </div>
    </>
  )
}
