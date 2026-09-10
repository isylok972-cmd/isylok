'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'

type Categorie = { id: string; nom: string; icone: string | null }

type ArticleAModifier = {
  id: string
  reference: string
  nom: string
  description: string | null
  prixLocationJour: number
  prixVente: number | null
  quantiteTotale: number
  seuilAlerte: number
  categorie: { id: string; nom: string; icone: string | null }
}

export function ModaleModifierArticle({
  article,
  categories,
  onFermer,
  onSucces,
}: {
  article: ArticleAModifier
  categories: Categorie[]
  onFermer: () => void
  onSucces: () => void
}) {
  const [donnees, setDonnees] = useState({
    nom: article.nom,
    description: article.description || '',
    categorieId: article.categorie.id,
    prixLocationJour: String(article.prixLocationJour),
    prixVente: article.prixVente != null ? String(article.prixVente) : '',
    quantiteTotale: String(article.quantiteTotale),
    seuilAlerte: String(article.seuilAlerte),
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setDonnees((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErreur('')
  }

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donnees.nom || !donnees.categorieId) {
      setErreur('Veuillez remplir tous les champs obligatoires')
      return
    }
    setEnCours(true)
    try {
      const rep = await fetch(`/api/stocks/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })
      const data = await rep.json()
      if (data.succes) {
        onSucces()
      } else {
        setErreur(data.message || 'Erreur lors de la modification')
      }
    } catch {
      setErreur('Erreur réseau')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>✏️ Modifier — {article.reference}</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>

        <form className={styles.formulaire} onSubmit={handleSoumettre}>
          {erreur && <div className={styles.erreurMessage}>❌ {erreur}</div>}

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Référence (non modifiable)</label>
              <input value={article.reference} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.champGroupe}>
              <label>Catégorie *</label>
              <select name="categorieId" value={donnees.categorieId} onChange={handleChange} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.champGroupe}>
            <label>Nom de l&apos;article *</label>
            <input
              name="nom"
              value={donnees.nom}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.champGroupe}>
            <label>Description</label>
            <textarea
              name="description"
              value={donnees.description}
              onChange={handleChange}
              placeholder="Description détaillée…"
            />
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Prix location / jour (€) *</label>
              <input
                name="prixLocationJour"
                type="number"
                step="0.01"
                value={donnees.prixLocationJour}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.champGroupe}>
              <label>Prix de vente (€)</label>
              <input
                name="prixVente"
                type="number"
                step="0.01"
                placeholder="Optionnel"
                value={donnees.prixVente}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Quantité totale *</label>
              <input
                name="quantiteTotale"
                type="number"
                value={donnees.quantiteTotale}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.champGroupe}>
              <label>Seuil d&apos;alerte</label>
              <input
                name="seuilAlerte"
                type="number"
                value={donnees.seuilAlerte}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className={styles.boutonSoumettre} disabled={enCours}>
            {enCours ? '⏳ Sauvegarde…' : '✓ Sauvegarder les modifications'}
          </button>
        </form>
      </div>
    </div>
  )
}
