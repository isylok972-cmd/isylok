'use client'

import { useState } from 'react'
import styles from '../stocks.module.css'
import { formaterPrix } from '@/lib/utilitaires'

type GrosEquipement = {
  id: string; numeroSerie: string; statut: string; etat: string;
  localisation: string | null; maintenances: { id: string; type: string; statut: string }[];
}
type Article = {
  id: string; reference: string; nom: string; description: string | null; type: string;
  prixLocationJour: number; quantiteTotale: number; quantiteDisponible: number; seuilAlerte: number;
  categorie: { id: string; nom: string; icone: string | null; couleur: string | null };
  grosEquipements: GrosEquipement[];
}

const BADGE_STATUT: Record<string, { classe: string; label: string }> = {
  DISPONIBLE: { classe: styles.badgeDisponible, label: '● Disponible' },
  LOUE: { classe: styles.badgeLoue, label: '● Loué' },
  EN_NETTOYAGE: { classe: styles.badgeNettoyage, label: '● Nettoyage' },
  EN_REPARATION: { classe: styles.badgeReparation, label: '● Réparation' },
}

const ETAT_LABELS: Record<string, string> = {
  NEUF: '✨ Neuf', BON: '👍 Bon', USE: '⚡ Usé', A_REPARER: '🔧 À réparer', HORS_SERVICE: '❌ HS',
}

export function TableauGrosMateriel({ articles, onAjouterEquipement, onMaintenance, onModifier, onSupprimer }: {
  articles: Article[]
  onAjouterEquipement: (articleId: string) => void
  onMaintenance: (equipementId: string) => void
  onModifier: (article: Article) => void
  onSupprimer: (articleId: string) => void
}) {
  const [lignesOuvertes, setLignesOuvertes] = useState<Set<string>>(new Set())

  const toggleLigne = (id: string) => {
    setLignesOuvertes((prev) => {
      const copie = new Set(prev)
      copie.has(id) ? copie.delete(id) : copie.add(id)
      return copie
    })
  }

  if (articles.length === 0) {
    return (
      <div className={styles.etatVide}>
        <p>⛺</p>
        <h3>Aucun gros matériel</h3>
        <span>Ajoutez votre premier article pour commencer le suivi unitaire</span>
      </div>
    )
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th style={{ width: 30 }}></th>
            <th>Article</th>
            <th>Catégorie</th>
            <th>Prix / jour</th>
            <th>Unités</th>
            <th>Disponible</th>
            <th>Maintenances</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => {
            const ouvert = lignesOuvertes.has(article.id)
            const enMaintenance = article.grosEquipements.filter((e) => e.maintenances.length > 0).length
            const pourcentage = article.quantiteTotale > 0
              ? Math.round((article.quantiteDisponible / article.quantiteTotale) * 100) : 0
            const alerte = article.quantiteDisponible <= article.seuilAlerte
            const couleurJauge = alerte ? '#ef4444' : pourcentage > 50 ? '#10b981' : '#f59e0b'

            // ✅ FIX: Fragment avec key explicite via array de deux éléments
            return [
              <tr key={article.id} style={{ cursor: 'pointer' }} onClick={() => toggleLigne(article.id)}>
                <td style={{ fontSize: 12, color: '#64748b' }}>{ouvert ? '▼' : '▶'}</td>
                <td>
                  <div className={styles.celluleArticle}>
                    <div className={styles.iconeCategorie} style={{ background: `${article.categorie.couleur || '#7C1023'}18`, border: `1px solid ${article.categorie.couleur || '#7C1023'}33` }}>
                      {article.categorie.icone || '📦'}
                    </div>
                    <div>
                      <div className={styles.nomArticle}>{article.nom}</div>
                      <div className={styles.refArticle}>{article.reference}</div>
                    </div>
                  </div>
                </td>
                <td>{article.categorie.nom}</td>
                <td><span className={styles.prix}>{formaterPrix(article.prixLocationJour)}</span></td>
                <td>{article.grosEquipements.length} unités</td>
                <td>
                  <div className={styles.jaugeStock}>
                    <span className={`${styles.jaugeTexte} ${alerte ? styles.jaugeTexteAlerte : ''}`}>
                      {article.quantiteDisponible} / {article.quantiteTotale}
                    </span>
                    <div className={styles.jaugeBarre}>
                      <div className={styles.jaugeRemplissage} style={{ width: `${pourcentage}%`, background: couleurJauge }} />
                    </div>
                  </div>
                </td>
                <td>{enMaintenance > 0 ? <span className={styles.badgeNettoyage} style={{ cursor: 'default' }}>🔧 {enMaintenance} en cours</span> : <span style={{ color: '#64748b', fontSize: 13 }}>Aucune</span>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className={styles.actionsCell}>
                    <button
                      className={styles.boutonAction}
                      title="Ajouter une unité"
                      onClick={() => onAjouterEquipement(article.id)}
                    >+</button>
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
              </tr>,
              ouvert && (
                <tr key={`${article.id}-detail`} className={styles.sousTableau}>
                  <td colSpan={8}>
                    <div className={styles.listeEquipements}>
                      {article.grosEquipements.length === 0 ? (
                        <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: 13 }}>
                          Aucune unité enregistrée — cliquez sur + pour ajouter un numéro de série
                        </div>
                      ) : article.grosEquipements.map((equip) => (
                        <div key={equip.id} className={styles.carteEquipement}>
                          <div className={styles.equipementInfo}>
                            <span className={styles.equipementSerie}>{equip.numeroSerie}</span>
                            <span className={BADGE_STATUT[equip.statut]?.classe || styles.badge}>
                              {BADGE_STATUT[equip.statut]?.label || equip.statut}
                            </span>
                            <span className={styles.equipementEtat}>{ETAT_LABELS[equip.etat] || equip.etat}</span>
                            {equip.localisation && <span style={{ fontSize: 12, color: '#64748b' }}>📍 {equip.localisation}</span>}
                          </div>
                          <div className={styles.actionsCell}>
                            <button className={styles.boutonAction} title="Maintenance" onClick={() => onMaintenance(equip.id)}>🔧</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
