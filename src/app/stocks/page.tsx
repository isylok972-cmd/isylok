'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './stocks.module.css'
import { TableauGrosMateriel } from './composants/TableauGrosMateriel'
import { TableauPetitMateriel } from './composants/TableauPetitMateriel'
import { ModaleAjoutArticle } from './composants/ModaleAjoutArticle'
import { ModaleModifierArticle } from './composants/ModaleModifierArticle'
import { ModaleAjoutEquipement } from './composants/ModaleAjoutEquipement'
import { ModaleMaintenance } from './composants/ModaleMaintenance'
import { ModaleImportCSV, ImportResultat } from './composants/ModaleImportCSV'
import { formaterPrix } from '@/lib/utilitaires'

type Categorie = { id: string; nom: string; type: string; icone: string | null; couleur: string | null; nombreArticles: number }
type Article = {
  id: string; reference: string; nom: string; description: string | null; type: string;
  prixLocationJour: number; prixVente: number | null; quantiteTotale: number;
  quantiteDisponible: number; seuilAlerte: number; statut: string;
  categorie: { id: string; nom: string; icone: string | null; couleur: string | null };
  grosEquipements: GrosEquipement[];
}
type GrosEquipement = {
  id: string; articleId: string; numeroSerie: string; statut: string; etat: string;
  dateAchat: string | null; valeurAchat: number | null; localisation: string | null; notes: string | null;
  maintenances: Maintenance[];
}
type Maintenance = { id: string; type: string; description: string; cout: number | null; statut: string; dateDebut: string }

type OngletActif = 'GROS_MATERIEL' | 'PETIT_MATERIEL'
type ModaleOuverte = null | 'ajout-article' | 'modifier-article' | 'ajout-equipement' | 'maintenance' | 'import-csv'

export default function PageStocks() {
  const [onglet, setOnglet] = useState<OngletActif>('GROS_MATERIEL')
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [chargement, setChargement] = useState(true)
  const [modale, setModale] = useState<ModaleOuverte>(null)
  const [articleSelectionne, setArticleSelectionne] = useState<string | null>(null)
  const [articleAModifier, setArticleAModifier] = useState<Article | null>(null)
  const [equipementSelectionne, setEquipementSelectionne] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'succes' | 'erreur'; message: string } | null>(null)

  const chargerDonnees = useCallback(async () => {
    try {
      const [repArticles, repCategories] = await Promise.all([
        fetch(`/api/stocks?type=${onglet}${recherche ? `&recherche=${recherche}` : ''}${filtreCategorie ? `&categorieId=${filtreCategorie}` : ''}`),
        fetch('/api/stocks/categories'),
      ])
      const dataArticles = await repArticles.json()
      const dataCategories = await repCategories.json()
      if (dataArticles.succes) setArticles(dataArticles.donnees)
      if (dataCategories.succes) setCategories(dataCategories.donnees)
    } catch (err) {
      console.error('Erreur chargement:', err)
    } finally {
      setChargement(false)
    }
  }, [onglet, recherche, filtreCategorie])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  const handleOnglet = (nouvelOnglet: OngletActif) => {
    setOnglet(nouvelOnglet)
    setRecherche('')
    setFiltreCategorie('')
    setChargement(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleModifier = (article: any) => {
    setArticleAModifier(article)
    setModale('modifier-article')
  }

  const handleSupprimer = async (articleId: string) => {
    if (!confirm('Supprimer cet article définitivement ? Cette action est irréversible.')) return
    try {
      const rep = await fetch(`/api/stocks/${articleId}`, { method: 'DELETE' })
      const data = await rep.json()
      if (data.succes) {
        chargerDonnees()
      } else {
        alert(data.message || 'Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur réseau')
    }
  }

  const handleSuccesImport = (res: ImportResultat) => {
    setModale(null)
    setNotification({
      type: 'succes',
      message: res.message || `Importation réussie : ${res.statistiques.crees} créé(s), ${res.statistiques.misAJour} mis à jour.`,
    })
    chargerDonnees()
    setTimeout(() => {
      setNotification(null)
    }, 7000)
  }

  // Statistiques
  const totalArticles = articles.length
  const totalDisponible = articles.reduce((s, a) => s + a.quantiteDisponible, 0)
  const totalPieces = articles.reduce((s, a) => s + a.quantiteTotale, 0)
  const alertes = articles.filter((a) => a.quantiteDisponible <= a.seuilAlerte).length
  const valeurStock = articles.reduce((s, a) => s + a.prixLocationJour * a.quantiteTotale, 0)

  const categoriesOnglet = categories.filter((c) => c.type === onglet)

  return (
    <main className={styles.conteneur}>
      {/* Toast Notification */}
      {notification && (
        <div className={`${styles.notificationToast} ${notification.type === 'succes' ? styles.notificationSucces : ''}`}>
          <span className={styles.notificationSuccesIcone}>
            {notification.type === 'succes' ? '✅' : '❌'}
          </span>
          <div>
            <strong>{notification.type === 'succes' ? 'Succès de l\'import' : 'Erreur'}</strong>
            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>{notification.message}</p>
          </div>
          <button
            className={styles.notificationFermer}
            onClick={() => setNotification(null)}
            title="Fermer la notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* En-tête */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>📦</span>
            <h1>Gestion des Stocks</h1>
          </div>
        </div>
        <div className={styles.enteteDroite}>
          <button
            className={styles.boutonImporter}
            onClick={() => setModale('import-csv')}
            title="Importer un fichier CSV ou TSV"
          >
            <span>📤</span> Importer CSV
          </button>
          <button className={styles.boutonAjouter} onClick={() => setModale('ajout-article')}>
            + Ajouter un article
          </button>
        </div>
      </header>

      {/* Stats rapides */}
      <section className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Articles</span>
            <span className={styles.carteStatIcone}>📋</span>
          </div>
          <div className={styles.carteStatValeur}>{totalArticles}</div>
          <div className={styles.carteStatSous}>{totalPieces} pièces au total</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Disponible</span>
            <span className={styles.carteStatIcone}>✅</span>
          </div>
          <div className={styles.carteStatValeur}>{totalDisponible}</div>
          <div className={styles.carteStatSous}>pièces prêtes à louer</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Alertes</span>
            <span className={styles.carteStatIcone}>⚠️</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: alertes > 0 ? '#f87171' : '#34d399' }}>{alertes}</div>
          <div className={styles.carteStatSous}>stocks critiques</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Valeur/jour</span>
            <span className={styles.carteStatIcone}>💰</span>
          </div>
          <div className={styles.carteStatValeur} style={{ fontSize: 22 }}>{formaterPrix(valeurStock)}</div>
          <div className={styles.carteStatSous}>potentiel location</div>
        </div>
      </section>

      {/* Onglets */}
      <div className={styles.onglets}>
        <button className={`${styles.onglet} ${onglet === 'GROS_MATERIEL' ? styles.ongletActif : ''}`} onClick={() => handleOnglet('GROS_MATERIEL')}>
          <span className={styles.ongletEmoji}>⛺</span> Gros Matériel — Chapiteaux &amp; Mobilier
        </button>
        <button className={`${styles.onglet} ${onglet === 'PETIT_MATERIEL' ? styles.ongletActif : ''}`} onClick={() => handleOnglet('PETIT_MATERIEL')}>
          <span className={styles.ongletEmoji}>🍽️</span> Petit Matériel — Vaisselle &amp; Linge
        </button>
      </div>

      {/* Barre d'outils */}
      <div className={styles.barreOutils}>
        <div className={styles.champRecherche}>
          <span className={styles.iconeRecherche}>🔍</span>
          <input type="text" placeholder="Rechercher un article…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <select className={styles.selectFiltre} value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categoriesOnglet.map((c) => (
            <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
          ))}
        </select>
      </div>

      {/* Contenu selon l'onglet */}
      {chargement ? (
        <div className={styles.etatVide}><p>⏳</p><h3>Chargement…</h3></div>
      ) : onglet === 'GROS_MATERIEL' ? (
        <TableauGrosMateriel
          articles={articles}
          onAjouterEquipement={(articleId) => { setArticleSelectionne(articleId); setModale('ajout-equipement') }}
          onMaintenance={(equipementId) => { setEquipementSelectionne(equipementId); setModale('maintenance') }}
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
        />
      ) : (
        <TableauPetitMateriel
          articles={articles}
          onRecharger={chargerDonnees}
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
        />
      )}

      {/* Modales */}
      {modale === 'import-csv' && (
        <ModaleImportCSV
          ongletActif={onglet}
          onFermer={() => setModale(null)}
          onSucces={handleSuccesImport}
        />
      )}
      {modale === 'ajout-article' && (
        <ModaleAjoutArticle
          type={onglet}
          categories={categoriesOnglet}
          onFermer={() => setModale(null)}
          onSucces={() => { setModale(null); chargerDonnees() }}
        />
      )}
      {modale === 'modifier-article' && articleAModifier && (
        <ModaleModifierArticle
          article={articleAModifier}
          categories={categoriesOnglet}
          onFermer={() => { setModale(null); setArticleAModifier(null) }}
          onSucces={() => { setModale(null); setArticleAModifier(null); chargerDonnees() }}
        />
      )}
      {modale === 'ajout-equipement' && articleSelectionne && (
        <ModaleAjoutEquipement
          articleId={articleSelectionne}
          onFermer={() => { setModale(null); setArticleSelectionne(null) }}
          onSucces={() => { setModale(null); setArticleSelectionne(null); chargerDonnees() }}
        />
      )}
      {modale === 'maintenance' && equipementSelectionne && (
        <ModaleMaintenance
          equipementId={equipementSelectionne}
          onFermer={() => { setModale(null); setEquipementSelectionne(null) }}
          onSucces={() => { setModale(null); setEquipementSelectionne(null); chargerDonnees() }}
        />
      )}
    </main>
  )
}
