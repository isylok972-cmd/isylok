'use client'

import { useState } from 'react'
import styles from '../clients.module.css'

interface PropsModaleCaution {
  clientId: string
  clientNom: string
  onFermer: () => void
  onSucces: () => void
}

export function ModaleCaution({ clientId, clientNom, onFermer, onSucces }: PropsModaleCaution) {
  const [montant, setMontant] = useState('')
  const [type, setType] = useState('CHEQUE')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!montant || parseFloat(montant) <= 0) { setErreur('Montant invalide'); return }
    setChargement(true)
    setErreur('')
    try {
      const rep = await fetch('/api/clients/cautions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, montant, type, reference, notes }),
      })
      const data = await rep.json()
      if (data.succes) { onSucces() } else { setErreur(data.message || 'Erreur') }
    } catch { setErreur('Erreur réseau') }
    finally { setChargement(false) }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={e => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>🔒 Nouvelle caution</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
          Pour le client <strong style={{ color: '#f9a8d4' }}>{clientNom}</strong>
        </p>

        <form className={styles.formulaire} onSubmit={soumettre}>
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Montant (€) *</label>
              <input type="number" step="0.01" min="0" value={montant} onChange={e => setMontant(e.target.value)} placeholder="500.00" required />
            </div>
            <div className={styles.champGroupe}>
              <label>Type *</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="CHEQUE">📝 Chèque</option>
                <option value="ESPECES">💵 Espèces</option>
                <option value="VIREMENT">🏦 Virement</option>
                <option value="CB">💳 Carte bancaire</option>
              </select>
            </div>
          </div>

          <div className={styles.champGroupe}>
            <label>Référence (n° de chèque, etc.)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="N° 1234567" />
          </div>

          <div className={styles.champGroupe}>
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informations complémentaires…" />
          </div>

          {erreur && <div className={styles.erreurMessage}>⚠️ {erreur}</div>}

          <button type="submit" className={styles.boutonSoumettre} disabled={chargement}>
            {chargement ? '⏳ Enregistrement…' : '🔒 Enregistrer la caution'}
          </button>
        </form>
      </div>
    </div>
  )
}
