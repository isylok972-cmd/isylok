'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'

export function ModaleMaintenance({ equipementId, onFermer, onSucces }: {
  equipementId: string; onFermer: () => void; onSucces: () => void
}) {
  const [donnees, setDonnees] = useState({
    type: 'REPARATION', description: '', cout: '', prestataire: '',
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDonnees((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErreur('')
  }

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donnees.description) { setErreur('La description est obligatoire'); return }
    setEnCours(true)
    try {
      const rep = await fetch('/api/stocks/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donnees, grosEquipementId: equipementId }),
      })
      const data = await rep.json()
      if (data.succes) { onSucces() } else { setErreur(data.message) }
    } catch { setErreur('Erreur réseau') }
    finally { setEnCours(false) }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>🔧 Nouvelle Maintenance</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>
        <form className={styles.formulaire} onSubmit={handleSoumettre}>
          {erreur && <div className={styles.erreurMessage}>❌ {erreur}</div>}
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Type d&apos;intervention *</label>
              <select name="type" value={donnees.type} onChange={handleChange}>
                <option value="REPARATION">🔧 Réparation</option>
                <option value="NETTOYAGE">🧹 Nettoyage</option>
                <option value="INSPECTION">🔍 Inspection</option>
              </select>
            </div>
            <div className={styles.champGroupe}>
              <label>Prestataire</label>
              <input name="prestataire" placeholder="Nom du prestataire" value={donnees.prestataire} onChange={handleChange} />
            </div>
          </div>
          <div className={styles.champGroupe}>
            <label>Description de l&apos;intervention *</label>
            <textarea name="description" placeholder="Décrivez la nature de l'intervention…" value={donnees.description} onChange={handleChange} required />
          </div>
          <div className={styles.champGroupe}>
            <label>Coût estimé (€)</label>
            <input name="cout" type="number" step="0.01" placeholder="0.00" value={donnees.cout} onChange={handleChange} />
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 10, color: '#fbbf24', fontSize: 13 }}>
            ⚠️ L&apos;équipement sera automatiquement marqué en maintenance et indisponible à la location.
          </div>
          <button type="submit" className={styles.boutonSoumettre} disabled={enCours}>
            {enCours ? '⏳ Enregistrement…' : '✓ Lancer la maintenance'}
          </button>
        </form>
      </div>
    </div>
  )
}
