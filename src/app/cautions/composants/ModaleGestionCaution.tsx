'use client'

import React, { useState, useEffect } from 'react'
import styles from '../cautions.module.css'
import { formaterPrix, formaterDate } from '@/lib/utilitaires'

export interface CautionComplete {
  id: string
  clientId: string
  devisId: string | null
  montant: number
  type: string
  reference: string | null
  statut: string
  dateDepot: string | null
  dateRestitution: string | null
  montantRetenu: number
  montantRestitue: number | null
  motifRetenue: string | null
  notes: string | null
  dateCreation: string
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    telephone: string
    email: string | null
    adresse?: string | null
    ville?: string | null
  }
  devis?: {
    id: string
    numero: string
    statut: string
    dateEvenement: string | null
    lieuEvenement: string | null
    totalTtc: number
  } | null
  declarationsCasse: Array<{
    id: string
    articleId: string
    quantite: number
    motif: string
    description: string | null
    impactCaution: number | null
    article: {
      id: string
      nom: string
      reference: string
      prixVente?: number | null
    }
  }>
}

interface ModaleGestionCautionProps {
  caution: CautionComplete
  onFermer: () => void
  onSauvegarder: () => void
  onOuvrirPdf: (cautionId: string) => void
}

export function ModaleGestionCaution({
  caution,
  onFermer,
  onSauvegarder,
  onOuvrirPdf
}: ModaleGestionCautionProps) {
  const [statut, setStatut] = useState(caution.statut)
  const [montant, setMontant] = useState(caution.montant.toString())
  const [type, setType] = useState(caution.type)
  const [reference, setReference] = useState(caution.reference || '')
  const [montantRetenu, setMontantRetenu] = useState(caution.montantRetenu?.toString() || '0')
  const [motifRetenue, setMotifRetenue] = useState(caution.motifRetenue || '')
  const [notes, setNotes] = useState(caution.notes || '')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Somme estimée des casses atelier
  const totalImpactCasses = caution.declarationsCasse.reduce(
    (acc, c) => acc + (c.impactCaution || 0),
    0
  )

  // Calcul du solde restitué en direct
  const montantInitialNum = parseFloat(montant) || 0
  const retenueNum = parseFloat(montantRetenu) || 0
  const soldeRestitue = Math.max(0, montantInitialNum - retenueNum)

  // Raccourci 1 : Restituer la totalité
  const actionRestituerTout = () => {
    setStatut('RESTITUE')
    setMontantRetenu('0')
    setMotifRetenue('')
  }

  // Raccourci 2 : Restituer avec retenue (préremplir avec la casse si existante)
  const actionRetenuePartielle = () => {
    setStatut('ENCAISSE_PARTIEL')
    if (totalImpactCasses > 0 && retenueNum === 0) {
      setMontantRetenu(totalImpactCasses.toString())
      setMotifRetenue(`Retenue pour casse/dégradation atelier (${caution.declarationsCasse.length} article(s))`)
    }
  }

  // Raccourci 3 : Encaisser la totalité
  const actionEncaisserTotal = () => {
    setStatut('ENCAISSE_TOTAL')
    setMontantRetenu(montant)
    if (!motifRetenue) {
      setMotifRetenue('Encaissement intégral de la caution pour dégradations majeures ou matériel non restitué')
    }
  }

  const enregistrer = async () => {
    setChargement(true)
    setErreur(null)

    try {
      const rep = await fetch(`/api/cautions/${caution.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut,
          montant: montantInitialNum,
          type,
          reference: reference || null,
          montantRetenu: retenueNum,
          montantRestitue: (statut === 'RESTITUE' || statut === 'ENCAISSE_PARTIEL') ? soldeRestitue : (statut === 'ENCAISSE_TOTAL' ? 0 : null),
          motifRetenue: motifRetenue || null,
          notes: notes || null
        })
      })

      const data = await rep.json()
      if (data.succes) {
        onSauvegarder()
        onFermer()
      } else {
        setErreur(data.message || 'Erreur lors de l’enregistrement')
      }
    } catch (err) {
      console.error(err)
      setErreur('Erreur de communication avec le serveur')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className={styles.modaleOverlay} onClick={onFermer}>
      <div className={styles.modaleConteneur} onClick={e => e.stopPropagation()}>
        {/* Entête */}
        <div className={styles.modaleEntete}>
          <div className={styles.modaleTitre}>
            <span>🛡️</span>
            <span>Gérer la Caution — CAU-{caution.id.slice(-6).toUpperCase()}</span>
          </div>
          <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">✕</button>
        </div>

        {/* Corps */}
        <div className={styles.modaleCorps}>
          {/* Bloc Récap Client & Événement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className={styles.carteInfos}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                {caution.client.entreprise || `${caution.client.prenom ? caution.client.prenom + ' ' : ''}${caution.client.nom}`}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                📞 {caution.client.telephone} {caution.client.email && `• ✉️ ${caution.client.email}`}
              </div>
            </div>

            <div className={styles.carteInfos}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Événement / Devis</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2dd4bf', marginTop: 2 }}>
                {caution.devis ? caution.devis.numero : 'Caution libre (hors devis)'}
              </div>
              {caution.devis?.dateEvenement && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  📅 Date : {formaterDate(caution.devis.dateEvenement)}
                  {caution.devis.lieuEvenement && ` • 📍 ${caution.devis.lieuEvenement}`}
                </div>
              )}
            </div>
          </div>

          {/* Détection automatique des casses déclarées à l'atelier */}
          {caution.declarationsCasse.length > 0 && (
            <div className={styles.blocCasseAtelier}>
              <div className={styles.blocCasseTitre}>
                <span>⚠️</span>
                <span>Signalements Atelier : {caution.declarationsCasse.length} article(s) cassé(s) ou dégradé(s)</span>
              </div>
              <div>
                {caution.declarationsCasse.map((casse, index) => (
                  <div key={index} className={styles.ligneCasseArticle}>
                    <div>
                      <strong>{casse.article.nom}</strong> ({casse.article.reference}) — {casse.quantite} unité(s) ({casse.motif})
                      {casse.description && <span style={{ fontStyle: 'italic', opacity: 0.8 }}> : {casse.description}</span>}
                    </div>
                    <div>
                      {casse.impactCaution ? (
                        <span style={{ fontWeight: 700, color: '#f87171' }}>{formaterPrix(casse.impactCaution)}</span>
                      ) : (
                        <span style={{ opacity: 0.6 }}>Non chiffré</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalImpactCasses > 0 && (
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>
                  Impact total estimé : {formaterPrix(totalImpactCasses)}
                </div>
              )}
            </div>
          )}

          {/* Actions Rapides en un clic */}
          <div className={styles.groupeChamps}>
            <label>Décision rapide de restitution</label>
            <div className={styles.actionsRapidesGrille}>
              <button
                type="button"
                className={`${styles.boutonActionRapide} ${styles.actionRestituerTout}`}
                onClick={actionRestituerTout}
              >
                <span>✅ Restituer tout</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>Aucune retenue (0 €)</span>
              </button>
              <button
                type="button"
                className={`${styles.boutonActionRapide} ${styles.actionRetenuePartielle}`}
                onClick={actionRetenuePartielle}
              >
                <span>⚠️ Retenue partielle</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>Déduire casse atelier</span>
              </button>
              <button
                type="button"
                className={`${styles.boutonActionRapide} ${styles.actionEncaisserTotal}`}
                onClick={actionEncaisserTotal}
              >
                <span>🛑 Encaisser total</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>Sinistre ou non-retour</span>
              </button>
            </div>
          </div>

          {/* Formulaire des modalités */}
          <div className={styles.ligneFormulaire}>
            <div className={styles.groupeChamps}>
              <label>Statut de la caution</label>
              <select
                className={styles.selectInput}
                value={statut}
                onChange={e => setStatut(e.target.value)}
              >
                <option value="EN_ATTENTE_DEPOT">⏳ En attente de dépôt</option>
                <option value="RECU_NON_ENCAISSE">🔒 Reçu / Sécurisé (non encaissé)</option>
                <option value="RESTITUE">✅ Restitué au client (Totalité)</option>
                <option value="ENCAISSE_PARTIEL">⚠️ Restitué avec retenue partielle</option>
                <option value="ENCAISSE_TOTAL">🛑 Encaissé totalement</option>
              </select>
            </div>

            <div className={styles.groupeChamps}>
              <label>Mode de règlement</label>
              <select
                className={styles.selectInput}
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="CHEQUE">Chèque de caution</option>
                <option value="CB_EMPREINTE">Empreinte Carte Bancaire</option>
                <option value="ESPECES">Espèces</option>
                <option value="VIREMENT">Virement bancaire</option>
              </select>
            </div>
          </div>

          <div className={styles.ligneFormulaire}>
            <div className={styles.groupeChamps}>
              <label>Montant initial de la caution (€)</label>
              <input
                type="number"
                step="0.01"
                className={styles.inputTexte}
                value={montant}
                onChange={e => setMontant(e.target.value)}
              />
            </div>

            <div className={styles.groupeChamps}>
              <label>Référence (N° Chèque / Transaction)</label>
              <input
                type="text"
                className={styles.inputTexte}
                placeholder="Ex: CHQ-8829103 ou TR-CB-991"
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </div>
          </div>

          {/* Calculateur de retenue et restitution */}
          <div className={styles.blocCalculateur}>
            <div className={styles.calculateurLigne}>
              <span style={{ color: '#94a3b8' }}>Montant initial déposé :</span>
              <span style={{ fontWeight: 600 }}>{formaterPrix(montantInitialNum)}</span>
            </div>

            <div className={styles.calculateurLigne}>
              <span style={{ color: '#f87171', fontWeight: 600 }}>Retenue pour casse / dégradation :</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={montantInitialNum}
                  style={{ width: 110, textAlign: 'right' }}
                  className={styles.inputTexte}
                  value={montantRetenu}
                  onChange={e => setMontantRetenu(e.target.value)}
                />
                <span style={{ color: '#94a3b8' }}>€</span>
              </div>
            </div>

            {(statut === 'ENCAISSE_PARTIEL' || retenueNum > 0) && (
              <div className={styles.groupeChamps} style={{ marginTop: 4 }}>
                <label style={{ fontSize: 11 }}>Motif de la retenue</label>
                <input
                  type="text"
                  className={styles.inputTexte}
                  placeholder="Ex: Facturation casse 6 verres + 2 assiettes constatée au retour atelier"
                  value={motifRetenue}
                  onChange={e => setMotifRetenue(e.target.value)}
                />
              </div>
            )}

            <div className={styles.calculateurLigneGrand}>
              <span>Solde restitué au client :</span>
              <span className={styles.montantRestitueValeur}>
                {statut === 'ENCAISSE_TOTAL' ? formaterPrix(0) : formaterPrix(soldeRestitue)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.groupeChamps}>
            <label>Notes &amp; Historique</label>
            <textarea
              className={styles.textareaInput}
              rows={2}
              placeholder="Remarques éventuelles sur la restitution..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {erreur && (
            <div style={{ color: '#f87171', fontSize: 13, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
              ⚠️ {erreur}
            </div>
          )}
        </div>

        {/* Pied */}
        <div className={styles.modalePied}>
          <button
            type="button"
            className={styles.boutonPdf}
            onClick={() => onOuvrirPdf(caution.id)}
            title="Générer l'attestation officielle en PDF"
          >
            📄 Attestation PDF
          </button>
          <button type="button" className={styles.boutonSecondaire} onClick={onFermer}>
            Annuler
          </button>
          <button
            type="button"
            className={styles.boutonPrimaire}
            onClick={enregistrer}
            disabled={chargement}
          >
            {chargement ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  )
}
