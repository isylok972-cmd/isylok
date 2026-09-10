'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'

type Categorie = { id: string; nom: string; icone: string | null }

export function ModaleAjoutArticle({ type, categories, onFermer, onSucces }: {
  type: 'GROS_MATERIEL' | 'PETIT_MATERIEL'
  categories: Categorie[]
  onFermer: () => void
  onSucces: () => void
}) {
  const [donnees, setDonnees] = useState({
    reference: '', nom: '', description: '', categorieId: categories[0]?.id || '',
    prixLocationJour: '', prixVente: '', quantiteTotale: '', seuilAlerte: '5',
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDonnees((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErreur('')
  }

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donnees.reference || !donnees.nom || !donnees.categorieId) {
      setErreur('Veuillez remplir tous les champs obligatoires')
      return
    }
    setEnCours(true)
    try {
      const rep = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donnees, type }),
      })
      const data = await rep.json()
      if (data.succes) { onSucces() } else { setErreur(data.message || 'Erreur lors de la création') }
    } catch { setErreur('Erreur réseau') }
    finally { setEnCours(false) }
  }

  const estGros = type === 'GROS_MATERIEL'

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>{estGros ? '⛺' : '🍽️'} Nouvel article — {estGros ? 'Gros Matériel' : 'Petit Matériel'}</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>

        <form className={styles.formulaire} onSubmit={handleSoumettre}>
          {erreur && <div className={styles.erreurMessage}>❌ {erreur}</div>}

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Référence *</label>
              <input name="reference" placeholder={estGros ? 'CHP-003' : 'VAI-003'} value={donnees.reference} onChange={handleChange} required />
            </div>
            <div className={styles.champGroupe}>
              <label>Catégorie *</label>
              <select name="categorieId" value={donnees.categorieId} onChange={handleChange} required>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.champGroupe}>
            <label>Nom de l&apos;article *</label>
            <input name="nom" placeholder={estGros ? 'Chapiteau pagode 5x5m' : 'Flûte à champagne 16cl'} value={donnees.nom} onChange={handleChange} required />
          </div>

          <div className={styles.champGroupe}>
            <label>Description</label>
            <textarea name="description" placeholder="Description détaillée de l'article…" value={donnees.description} onChange={handleChange} />
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Prix location / jour (€) *</label>
              <input name="prixLocationJour" type="number" step="0.01" placeholder="0.00" value={donnees.prixLocationJour} onChange={handleChange} required />
            </div>
            <div className={styles.champGroupe}>
              <label>Prix de vente (€)</label>
              <input name="prixVente" type="number" step="0.01" placeholder="Optionnel" value={donnees.prixVente} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>{estGros ? 'Nombre d\'unités' : 'Quantité totale'} *</label>
              <input name="quantiteTotale" type="number" placeholder={estGros ? '4' : '500'} value={donnees.quantiteTotale} onChange={handleChange} required />
            </div>
            <div className={styles.champGroupe}>
              <label>Seuil d&apos;alerte</label>
              <input name="seuilAlerte" type="number" placeholder="5" value={donnees.seuilAlerte} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className={styles.boutonSoumettre} disabled={enCours}>
            {enCours ? '⏳ Création…' : '✓ Créer l\'article'}
          </button>
        </form>
      </div>
    </div>
  )
}
