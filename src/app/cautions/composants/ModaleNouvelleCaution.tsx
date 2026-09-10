'use client'

import React, { useState, useEffect } from 'react'
import styles from '../cautions.module.css'

interface ClientOption {
  id: string
  nom: string
  prenom: string | null
  entreprise: string | null
}

interface DevisOption {
  id: string
  numero: string
  totalTtc: number
  clientId: string
  dateEvenement: string | null
}

interface ModaleNouvelleCautionProps {
  onFermer: () => void
  onCree: () => void
}

export function ModaleNouvelleCaution({ onFermer, onCree }: ModaleNouvelleCautionProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [devisList, setDevisList] = useState<DevisOption[]>([])
  const [clientId, setClientId] = useState('')
  const [devisId, setDevisId] = useState('')
  const [montant, setMontant] = useState('500')
  const [type, setType] = useState('CHEQUE')
  const [reference, setReference] = useState('')
  const [statut, setStatut] = useState('RECU_NON_ENCAISSE')
  const [notes, setNotes] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    // Charger la liste des clients et devis
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/commercial/devis').then(r => r.json())
    ]).then(([resClients, resDevis]) => {
      if (resClients.succes && Array.isArray(resClients.donnees)) {
        setClients(resClients.donnees)
        if (resClients.donnees.length > 0) setClientId(resClients.donnees[0].id)
      }
      if (resDevis.succes && Array.isArray(resDevis.donnees)) {
        setDevisList(resDevis.donnees)
      }
    }).catch(err => console.error(err))
  }, [])

  // Si on sélectionne un devis, ajuster le client et suggérer un montant
  const onChangerDevis = (dId: string) => {
    setDevisId(dId)
    if (dId) {
      const devisChoisi = devisList.find(d => d.id === dId)
      if (devisChoisi) {
        setClientId(devisChoisi.clientId)
        // Caution suggérée : 30% du total TTC ou au moins 500 €
        const suggestion = Math.max(300, Math.round(devisChoisi.totalTtc * 0.35))
        setMontant(suggestion.toString())
      }
    }
  }

  const enregistrer = async () => {
    if (!clientId) {
      setErreur('Veuillez sélectionner un client.')
      return
    }

    const m = parseFloat(montant)
    if (isNaN(m) || m <= 0) {
      setErreur('Veuillez entrer un montant supérieur à 0.')
      return
    }

    setChargement(true)
    setErreur(null)

    try {
      const rep = await fetch('/api/cautions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          devisId: devisId || null,
          montant: m,
          type,
          reference: reference || null,
          statut,
          dateDepot: statut === 'RECU_NON_ENCAISSE' ? new Date() : null,
          notes: notes || null
        })
      })

      const data = await rep.json()
      if (data.succes) {
        onCree()
        onFermer()
      } else {
        setErreur(data.message || 'Erreur lors de la création de la caution.')
      }
    } catch (err) {
      console.error(err)
      setErreur('Erreur de communication avec le serveur.')
    } finally {
      setChargement(false)
    }
  }

  // Filtrer les devis selon le client sélectionné
  const devisFiltres = clientId
    ? devisList.filter(d => d.clientId === clientId)
    : devisList

  return (
    <div className={styles.modaleOverlay} onClick={onFermer}>
      <div className={styles.modaleConteneur} onClick={e => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <div className={styles.modaleTitre}>
            <span>🛡️</span>
            <span>Enregistrer un Dépôt de Garantie</span>
          </div>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>

        <div className={styles.modaleCorps}>
          <div className={styles.ligneFormulaire}>
            <div className={styles.groupeChamps}>
              <label>Client *</label>
              <select
                className={styles.selectInput}
                value={clientId}
                onChange={e => {
                  setClientId(e.target.value)
                  setDevisId('')
                }}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.entreprise ? `${c.entreprise} (${c.nom})` : `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.groupeChamps}>
              <label>Devis associé (Optionnel)</label>
              <select
                className={styles.selectInput}
                value={devisId}
                onChange={e => onChangerDevis(e.target.value)}
              >
                <option value="">-- Aucun devis / Caution libre --</option>
                {devisFiltres.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.numero} ({d.totalTtc} €)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.ligneFormulaire}>
            <div className={styles.groupeChamps}>
              <label>Montant de la caution (€) *</label>
              <input
                type="number"
                step="10"
                min="1"
                className={styles.inputTexte}
                value={montant}
                onChange={e => setMontant(e.target.value)}
              />
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
                <option value="ESPECES">Espèces (dépôt physique)</option>
                <option value="VIREMENT">Virement bancaire</option>
              </select>
            </div>
          </div>

          <div className={styles.ligneFormulaire}>
            <div className={styles.groupeChamps}>
              <label>Statut initial</label>
              <select
                className={styles.selectInput}
                value={statut}
                onChange={e => setStatut(e.target.value)}
              >
                <option value="RECU_NON_ENCAISSE">🔒 Reçu / Sécurisé en coffre (non encaissé)</option>
                <option value="EN_ATTENTE_DEPOT">⏳ En attente de remise par le client</option>
              </select>
            </div>

            <div className={styles.groupeChamps}>
              <label>Référence (N° Chèque, Transaction)</label>
              <input
                type="text"
                className={styles.inputTexte}
                placeholder="Ex: CHQ-992812 ou EMP-CB-004"
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.groupeChamps}>
            <label>Notes &amp; Observations</label>
            <textarea
              className={styles.textareaInput}
              rows={2}
              placeholder="Ex: Chèque conservé dans le coffre n°2, restitution prévue au retour de la vaisselle..."
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

        <div className={styles.modalePied}>
          <button type="button" className={styles.boutonSecondaire} onClick={onFermer}>
            Annuler
          </button>
          <button
            type="button"
            className={styles.boutonPrimaire}
            onClick={enregistrer}
            disabled={chargement}
          >
            {chargement ? 'Création…' : 'Enregistrer la caution'}
          </button>
        </div>
      </div>
    </div>
  )
}
