'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'

export function ModaleAjoutEquipement({ articleId, onFermer, onSucces }: {
  articleId: string; onFermer: () => void; onSucces: () => void
}) {
  const [donnees, setDonnees] = useState({
    numeroSerie: '', etat: 'BON', dateAchat: '', valeurAchat: '', localisation: '', notes: '',
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDonnees((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErreur('')
  }

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donnees.numeroSerie) { setErreur('Le numéro de série est obligatoire'); return }
    setEnCours(true)
    try {
      const rep = await fetch('/api/stocks/equipements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donnees, articleId }),
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
          <h2>🏷️ Nouvel Équipement</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>
        <form className={styles.formulaire} onSubmit={handleSoumettre}>
          {erreur && <div className={styles.erreurMessage}>❌ {erreur}</div>}
          <div className={styles.champGroupe}>
            <label>Numéro de série *</label>
            <input name="numeroSerie" placeholder="CHP10-2024-005" value={donnees.numeroSerie} onChange={handleChange} required style={{ fontFamily: 'monospace' }} />
          </div>
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>État</label>
              <select name="etat" value={donnees.etat} onChange={handleChange}>
                <option value="NEUF">✨ Neuf</option>
                <option value="BON">👍 Bon état</option>
                <option value="USE">⚡ Usé</option>
                <option value="A_REPARER">🔧 À réparer</option>
              </select>
            </div>
            <div className={styles.champGroupe}>
              <label>Localisation</label>
              <input name="localisation" placeholder="Entrepôt A" value={donnees.localisation} onChange={handleChange} />
            </div>
          </div>
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Date d&apos;achat</label>
              <input name="dateAchat" type="date" value={donnees.dateAchat} onChange={handleChange} />
            </div>
            <div className={styles.champGroupe}>
              <label>Valeur d&apos;achat (€)</label>
              <input name="valeurAchat" type="number" step="0.01" placeholder="0.00" value={donnees.valeurAchat} onChange={handleChange} />
            </div>
          </div>
          <div className={styles.champGroupe}>
            <label>Notes</label>
            <textarea name="notes" placeholder="Remarques sur cet équipement…" value={donnees.notes} onChange={handleChange} />
          </div>
          <button type="submit" className={styles.boutonSoumettre} disabled={enCours}>
            {enCours ? '⏳ Ajout…' : '✓ Enregistrer l\'équipement'}
          </button>
        </form>
      </div>
    </div>
  )
}
