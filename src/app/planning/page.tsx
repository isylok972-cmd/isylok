'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import styles from './planning.module.css'
import { formaterDate, formaterPrix } from '@/lib/utilitaires'
import { ModaleDetailPlanning, EvenementPlanning } from './composants/ModaleDetailPlanning'

type TypeVue = 'MOIS' | 'SEMAINE' | 'AGENDA'

interface Categorie {
  id: string
  nom: string
  icone?: string | null
  type: string
}

export default function PagePlanning() {
  const [vue, setVue] = useState<TypeVue>('MOIS')
  const [dateReference, setDateReference] = useState<Date>(() => new Date())
  const [chargement, setChargement] = useState(true)

  // Données
  const [evenements, setEvenements] = useState<EvenementPlanning[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [stats, setStats] = useState({
    totalEvenements: 0,
    evenementsNormaux: 0,
    evenementsCritiques: 0,
    evenementsSurreservation: 0
  })

  // Filtres
  const [categorieSelectionnee, setCategorieSelectionnee] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')

  // Modale détail
  const [evenementModal, setEvenementModal] = useState<EvenementPlanning | null>(null)

  // Chargement des données
  const chargerDonnees = useCallback(async () => {
    setChargement(true)
    try {
      const url = new URL('/api/planning', window.location.origin)
      if (categorieSelectionnee) url.searchParams.set('categorie', categorieSelectionnee)
      if (recherche) url.searchParams.set('q', recherche)

      const rep = await fetch(url.toString())
      const data = await rep.json()
      if (data.succes) {
        setEvenements(data.donnees.evenements)
        setCategories(data.donnees.categories)
        setStats(data.donnees.stats)
      }
    } catch (err) {
      console.error('[Planning] Erreur chargement:', err)
    } finally {
      setChargement(false)
    }
  }, [categorieSelectionnee, recherche])

  useEffect(() => {
    chargerDonnees()
  }, [chargerDonnees])

  // Navigation temporelle
  const naviguerPrecedent = () => {
    setDateReference(prev => {
      const n = new Date(prev)
      if (vue === 'MOIS') n.setMonth(n.getMonth() - 1)
      else if (vue === 'SEMAINE') n.setDate(n.getDate() - 7)
      else n.setMonth(n.getMonth() - 1)
      return n
    })
  }

  const naviguerSuivant = () => {
    setDateReference(prev => {
      const n = new Date(prev)
      if (vue === 'MOIS') n.setMonth(n.getMonth() + 1)
      else if (vue === 'SEMAINE') n.setDate(n.getDate() + 7)
      else n.setMonth(n.getMonth() + 1)
      return n
    })
  }

  const allerAujourdhui = () => {
    setDateReference(new Date())
  }

  // Titre de la période affichée
  const titrePeriode = useMemo(() => {
    if (vue === 'MOIS' || vue === 'AGENDA') {
      return dateReference.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    } else {
      // Semaine : trouver le lundi
      const jourSemaine = (dateReference.getDay() + 6) % 7
      const lundi = new Date(dateReference)
      lundi.setDate(lundi.getDate() - jourSemaine)
      const dimanche = new Date(lundi)
      dimanche.setDate(dimanche.getDate() + 6)

      const d1 = lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const d2 = dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${d1} - ${d2}`
    }
  }, [dateReference, vue])

  // Génération de la matrice mensuelle (35 à 42 cellules)
  const grilleMois = useMemo(() => {
    const annee = dateReference.getFullYear()
    const mois = dateReference.getMonth()

    const premierJourDuMois = new Date(annee, mois, 1)
    const dernierJourDuMois = new Date(annee, mois + 1, 0)

    // Décalage pour commencer le lundi (0: lundi, 6: dimanche)
    const decalageDebut = (premierJourDuMois.getDay() + 6) % 7

    const jours: Array<{
      date: Date
      estMoisActuel: boolean
      estAujourdhui: boolean
      cle: string
      evenements: EvenementPlanning[]
    }> = []

    // Jours du mois précédent pour combler
    for (let i = decalageDebut; i > 0; i--) {
      const d = new Date(annee, mois, 1 - i)
      const cle = d.toISOString().slice(0, 10)
      jours.push({
        date: d,
        estMoisActuel: false,
        estAujourdhui: cle === new Date().toISOString().slice(0, 10),
        cle,
        evenements: evenements.filter(ev => {
          const deb = ev.dateDebut.slice(0, 10)
          const fin = ev.dateFin.slice(0, 10)
          return cle >= deb && cle <= fin
        })
      })
    }

    // Jours du mois en cours
    for (let i = 1; i <= dernierJourDuMois.getDate(); i++) {
      const d = new Date(annee, mois, i)
      const cle = d.toISOString().slice(0, 10)
      jours.push({
        date: d,
        estMoisActuel: true,
        estAujourdhui: cle === new Date().toISOString().slice(0, 10),
        cle,
        evenements: evenements.filter(ev => {
          const deb = ev.dateDebut.slice(0, 10)
          const fin = ev.dateFin.slice(0, 10)
          return cle >= deb && cle <= fin
        })
      })
    }

    // Jours du mois suivant pour finir la grille (multiple de 7)
    const reste = (7 - (jours.length % 7)) % 7
    for (let i = 1; i <= reste; i++) {
      const d = new Date(annee, mois + 1, i)
      const cle = d.toISOString().slice(0, 10)
      jours.push({
        date: d,
        estMoisActuel: false,
        estAujourdhui: cle === new Date().toISOString().slice(0, 10),
        cle,
        evenements: evenements.filter(ev => {
          const deb = ev.dateDebut.slice(0, 10)
          const fin = ev.dateFin.slice(0, 10)
          return cle >= deb && cle <= fin
        })
      })
    }

    return jours
  }, [dateReference, evenements])

  // Génération des 7 jours de la semaine
  const joursSemaine = useMemo(() => {
    const jourSemaine = (dateReference.getDay() + 6) % 7
    const lundi = new Date(dateReference)
    lundi.setDate(lundi.getDate() - jourSemaine)

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(lundi)
      d.setDate(d.getDate() + idx)
      const cle = d.toISOString().slice(0, 10)

      const departs = evenements.filter(ev => ev.dateDebut.slice(0, 10) === cle)
      const retours = evenements.filter(ev => ev.dateFin.slice(0, 10) === cle)
      const enCours = evenements.filter(ev => {
        const deb = ev.dateDebut.slice(0, 10)
        const fin = ev.dateFin.slice(0, 10)
        return cle > deb && cle < fin
      })

      return {
        date: d,
        nomJour: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        numeroJour: d.getDate(),
        cle,
        estAujourdhui: cle === new Date().toISOString().slice(0, 10),
        departs,
        retours,
        enCours
      }
    })
  }, [dateReference, evenements])

  // Classe CSS selon la tension
  const getClasseTension = (t: string) => {
    if (t === 'SURRESERVATION') return styles.tensionSurreservation
    if (t === 'CRITIQUE') return styles.tensionCritique
    return styles.tensionNormal
  }

  return (
    <main className={styles.conteneur}>
      {/* EN-TÊTE */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>
            ← Dashboard
          </Link>
          <div className={styles.titreModule}>
            <span>📅</span>
            <div>
              <h1>Planning &amp; Réservations</h1>
            </div>
          </div>
        </div>
      </header>

      {/* STATS RAPIDES */}
      <section className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Total Événements</span>
            <span className={styles.carteStatIcone}>📋</span>
          </div>
          <div className={styles.carteStatValeur}>{stats.totalEvenements}</div>
          <div className={styles.carteStatSous}>réservations programmées</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Stock Disponible</span>
            <span className={styles.carteStatIcone}>🟢</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#34d399' }}>
            {stats.evenementsNormaux}
          </div>
          <div className={styles.carteStatSous}>événements 100% sécurisés</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Tension Critique</span>
            <span className={styles.carteStatIcone}>🟠</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#fbbf24' }}>
            {stats.evenementsCritiques}
          </div>
          <div className={styles.carteStatSous}>charge parc &gt; 75%</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Alerte Overbooking</span>
            <span className={styles.carteStatIcone}>🔴</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#f87171' }}>
            {stats.evenementsSurreservation}
          </div>
          <div className={styles.carteStatSous}>dépassement capacité matériel</div>
        </div>
      </section>

      {/* BARRE DE NAVIGATION & OUTILS */}
      <section className={styles.barreNavigation}>
        <div className={styles.groupeBoutonsMois}>
          <button className={styles.boutonNavDate} onClick={naviguerPrecedent}>
            ◀ Précédent
          </button>
          <button className={styles.boutonNavDate} onClick={allerAujourdhui}>
            Aujourd&apos;hui
          </button>
          <button className={styles.boutonNavDate} onClick={naviguerSuivant}>
            Suivant ▶
          </button>
          <div className={styles.titrePeriode}>{titrePeriode}</div>
        </div>

        <div className={styles.selecteurVue}>
          <button
            className={`${styles.boutonVue} ${vue === 'MOIS' ? styles.boutonVueActif : ''}`}
            onClick={() => setVue('MOIS')}
          >
            📅 Mois
          </button>
          <button
            className={`${styles.boutonVue} ${vue === 'SEMAINE' ? styles.boutonVueActif : ''}`}
            onClick={() => setVue('SEMAINE')}
          >
            📊 Semaine (Timeline)
          </button>
          <button
            className={`${styles.boutonVue} ${vue === 'AGENDA' ? styles.boutonVueActif : ''}`}
            onClick={() => setVue('AGENDA')}
          >
            📋 Liste Agenda
          </button>
        </div>
      </section>

      {/* FILTRES PAR CATÉGORIES & RECHERCHE */}
      <section className={styles.barreFiltres}>
        <input
          type="text"
          placeholder="🔍 Rechercher un événement (numéro, client, ville, matériel)..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className={styles.champRecherche}
        />

        <div className={styles.pastillesFiltres}>
          <button
            className={`${styles.pastilleFiltre} ${categorieSelectionnee === null ? styles.pastilleFiltreActive : ''}`}
            onClick={() => setCategorieSelectionnee(null)}
          >
            ✨ Tout le matériel
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={`${styles.pastilleFiltre} ${categorieSelectionnee === c.nom ? styles.pastilleFiltreActive : ''}`}
              onClick={() => setCategorieSelectionnee(c.nom)}
            >
              {c.icone ? `${c.icone} ` : ''}{c.nom}
            </button>
          ))}
        </div>
      </section>

      {chargement ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <p style={{ fontSize: 36 }}>⏳</p>
          <h3>Chargement du planning et analyse des tensions de stock…</h3>
        </div>
      ) : vue === 'MOIS' ? (
        /* ================= VUE MOIS ================= */
        <div className={styles.calendrierMois}>
          <div className={styles.joursSemaineEntete}>
            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(j => (
              <div key={j} className={styles.jourSemaineTitre}>
                {j}
              </div>
            ))}
          </div>

          <div className={styles.grilleJours}>
            {grilleMois.map(jour => (
              <div
                key={jour.cle}
                className={`${styles.celluleJour} ${
                  !jour.estMoisActuel ? styles.celluleHorsMois : ''
                } ${jour.estAujourdhui ? styles.celluleAujourdhui : ''}`}
              >
                <div className={styles.numeroJourConteneur}>
                  <span className={styles.numeroJour}>{jour.date.getDate()}</span>
                  {jour.evenements.length > 0 && (
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                      {jour.evenements.length} évt
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {jour.evenements.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      className={`${styles.carteEvenementPlanning} ${getClasseTension(ev.tension)}`}
                      onClick={() => setEvenementModal(ev)}
                      title={`Cliquer pour voir le détail de ${ev.numero}`}
                    >
                      <div className={styles.evenementNumeroTitre}>
                        <span>{ev.numero}</span>
                        {ev.tension === 'SURRESERVATION' && <span>🔴</span>}
                        {ev.tension === 'CRITIQUE' && <span>🟠</span>}
                      </div>
                      <div className={styles.evenementClient}>
                        👤 {ev.client.nom}
                      </div>
                    </div>
                  ))}

                  {jour.evenements.length > 3 && (
                    <span style={{ fontSize: 10, color: '#fcd34d', textAlign: 'center', cursor: 'pointer' }}>
                      +{jour.evenements.length - 3} autres
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : vue === 'SEMAINE' ? (
        /* ================= VUE SEMAINE TIMELINE ================= */
        <div className={styles.timelineSemaine}>
          {joursSemaine.map(jour => (
            <div
              key={jour.cle}
              className={styles.colonneJourSemaine}
              style={{
                borderColor: jour.estAujourdhui ? '#C9A84C' : undefined,
                background: jour.estAujourdhui ? 'rgba(201, 168, 76, 0.05)' : undefined
              }}
            >
              <div className={styles.colonneJourEntete}>
                <div className={styles.colonneJourNom}>{jour.nomJour}</div>
                <div className={styles.colonneJourDate}>{jour.numeroJour}</div>
              </div>

              {/* DÉPARTS / SORTIES */}
              <div>
                <div className={styles.sectionFluxTitre}>
                  <span>📦</span> Départs ({jour.departs.length})
                </div>
                <div className={styles.listeFluxCartes}>
                  {jour.departs.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      Aucun départ
                    </div>
                  ) : (
                    jour.departs.map(ev => (
                      <div
                        key={ev.id}
                        className={`${styles.carteEvenementPlanning} ${getClasseTension(ev.tension)}`}
                        onClick={() => setEvenementModal(ev)}
                      >
                        <div className={styles.evenementNumeroTitre}>
                          <span>{ev.numero}</span>
                          {ev.tension === 'SURRESERVATION' && <span>🔴 Overbook</span>}
                        </div>
                        <div className={styles.evenementClient}>
                          👤 {ev.client.nom}
                        </div>
                        <div style={{ fontSize: 10, color: '#cbd5e1' }}>
                          📍 {ev.lieuEvenement}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RETOURS */}
              <div>
                <div className={styles.sectionFluxTitre}>
                  <span>🔄</span> Retours ({jour.retours.length})
                </div>
                <div className={styles.listeFluxCartes}>
                  {jour.retours.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      Aucun retour
                    </div>
                  ) : (
                    jour.retours.map(ev => (
                      <div
                        key={ev.id}
                        className={`${styles.carteEvenementPlanning} ${getClasseTension(ev.tension)}`}
                        onClick={() => setEvenementModal(ev)}
                      >
                        <div className={styles.evenementNumeroTitre}>
                          <span>{ev.numero}</span>
                        </div>
                        <div className={styles.evenementClient}>
                          👤 {ev.client.nom}
                        </div>
                        <div style={{ fontSize: 10, color: '#cbd5e1' }}>
                          🏁 Restitution
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= VUE AGENDA LISTE ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {evenements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              Aucun événement ne correspond aux critères.
            </div>
          ) : (
            evenements.map(ev => (
              <div
                key={ev.id}
                onClick={() => setEvenementModal(ev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(18, 18, 42, 0.6)',
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 24 }}>
                    {ev.tension === 'SURRESERVATION' ? '🔴' : ev.tension === 'CRITIQUE' ? '🟠' : '🟢'}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#f1f5f9' }}>{ev.numero}</span>
                      <span style={{ fontSize: 12, color: '#C9A84C' }}>• {ev.typeEvenement}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                      👤 {ev.client.nom} {ev.client.prenom || ''} {ev.client.entreprise ? `(${ev.client.entreprise})` : ''} • 📍 {ev.lieuEvenement}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#fcd34d' }}>
                    {formaterDate(ev.dateDebut)} → {formaterDate(ev.dateFin)}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    {ev.lignes.length} articles réservés • {formaterPrix(ev.totalTtc)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALE DÉTAIL ÉVÉNEMENT */}
      {evenementModal && (
        <ModaleDetailPlanning
          evenement={evenementModal}
          onFermer={() => setEvenementModal(null)}
        />
      )}
    </main>
  )
}
