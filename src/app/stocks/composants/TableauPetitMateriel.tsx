'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'
import { formaterPrix } from '@/lib/utilitaires'

type Article = {
  id: string; reference: string; nom: string; description: string | null;
  prixLocationJour: number; prixVente: number | null; quantiteTotale: number;
  quantiteDisponible: number; seuilAlerte: number; statut: string;
  categorie: { id: string; nom: string; icone: string | null; couleur: string | null };
}

export function TableauPetitMateriel({
  articles,
  onRecharger,
  onModifier,
  onSupprimer,
}: {
  articles: Article[]
  onRecharger: () => void
  onModifier: (article: Article) => void
  onSupprimer: (articleId: string) => void
}) {
  const [modifEnCours, setModifEnCours] = useState<string | null>(null)
  const [nouvelleQte, setNouvelleQte] = useState('')

  const handleModifierQuantite = async (articleId: string) => {
    if (!nouvelleQte) return
    try {
      const rep = await fetch(`/api/stocks/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantiteDisponible: parseInt(nouvelleQte) }),
      })
      if (rep.ok) {
        setModifEnCours(null)
        setNouvelleQte('')
        onRecharger()
      }
    } catch (err) {
      console.error('Erreur modification:', err)
    }
  }

  if (articles.length === 0) {
    return (
      <div className={styles.etatVide}>
        <p>🍽️</p>
        <h3>Aucun petit matériel</h3>
        <span>Ajoutez vos articles de vaisselle et linge pour le suivi par lots</span>
      </div>
    )
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>Article</th>
            <th>Catégorie</th>
            <th>Prix / jour (unité)</th>
            <th>Stock total</th>
            <th>Disponible</th>
            <th>Loué</th>
            <th>Taux dispo</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => {
            const enLocation = article.quantiteTotale - article.quantiteDisponible
            const pourcentage = article.quantiteTotale > 0
              ? Math.round((article.quantiteDisponible / article.quantiteTotale) * 100) : 0
            const alerte = article.quantiteDisponible <= article.seuilAlerte
            const couleurJauge = alerte ? '#ef4444' : pourcentage > 50 ? '#10b981' : '#f59e0b'
            const enEdition = modifEnCours === article.id

            return (
              <tr key={article.id}>
                <td>
                  <div className={styles.celluleArticle}>
                    <div
                      className={styles.iconeCategorie}
                      style={{
                        background: `${article.categorie.couleur || '#C9A84C'}18`,
                        border: `1px solid ${article.categorie.couleur || '#C9A84C'}33`,
                      }}
                    >
                      {article.categorie.icone || '🍽️'}
                    </div>
                    <div>
                      <div className={styles.nomArticle}>{article.nom}</div>
                      <div className={styles.refArticle}>{article.reference}</div>
                    </div>
                  </div>
                </td>
                <td>{article.categorie.nom}</td>
                <td><span className={styles.prix}>{formaterPrix(article.prixLocationJour)}</span></td>
                <td style={{ fontWeight: 600, fontSize: 15 }}>{article.quantiteTotale}</td>
                <td>
                  {enEdition ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={nouvelleQte}
                        onChange={(e) => setNouvelleQte(e.target.value)}
                        style={{
                          width: 70, padding: '4px 8px',
                          background: 'rgba(12,5,8,0.8)',
                          border: '1px solid #C9A84C',
                          borderRadius: 6, color: '#f5f0ee', fontSize: 14, outline: 'none',
                        }}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleModifierQuantite(article.id)}
                      />
                      <button className={styles.boutonAction} onClick={() => handleModifierQuantite(article.id)} title="Valider">✓</button>
                      <button className={styles.boutonAction} onClick={() => { setModifEnCours(null); setNouvelleQte('') }} title="Annuler">✕</button>
                    </div>
                  ) : (
                    <span
                      className={`${styles.jaugeTexte} ${alerte ? styles.jaugeTexteAlerte : ''}`}
                      style={{ fontWeight: 700, fontSize: 15 }}
                    >
                      {article.quantiteDisponible}{alerte && ' ⚠️'}
                    </span>
                  )}
                </td>
                <td style={{ color: enLocation > 0 ? '#C9A84C' : '#6b5858' }}>
                  {enLocation > 0 ? `${enLocation} en loc.` : '—'}
                </td>
                <td>
                  <div className={styles.jaugeStock}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: couleurJauge }}>{pourcentage}%</span>
                    <div className={styles.jaugeBarre}>
                      <div className={styles.jaugeRemplissage} style={{ width: `${pourcentage}%`, background: couleurJauge }} />
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button
                      className={styles.boutonAction}
                      title="Modifier quantité disponible"
                      onClick={() => { setModifEnCours(article.id); setNouvelleQte(String(article.quantiteDisponible)) }}
                    >📥</button>
                    <button
                      className={`${styles.boutonAction} ${styles.boutonModifier}`}
                      title="Modifier l'article"
                      onClick={() => onModifier(article)}
                    >✏️</button>
                    <button
                      className={`${styles.boutonAction} ${styles.boutonSupprimer}`}
                      title="Supprimer l'article"
                      onClick={() => onSupprimer(article.id)}
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
