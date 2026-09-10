'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './cautions.module.css'
import { formaterPrix } from '@/lib/utilitaires'
import { TableauCautions } from './composants/TableauCautions'
import { ModaleGestionCaution, CautionComplete } from './composants/ModaleGestionCaution'
import { ModaleNouvelleCaution } from './composants/ModaleNouvelleCaution'
import { ModaleApercuCautionPdf } from './composants/ModaleApercuCautionPdf'

interface KpisCautions {
  totalCautionsEnCours: number
  alertesLitiges: number
  aRestituerCetteSemaine: number
  totalDossiers: number
}

export default function PageCautions() {
  const [cautions, setCautions] = useState<CautionComplete[]>([])
  const [kpis, setKpis] = useState<KpisCautions>({
    totalCautionsEnCours: 0,
    alertesLitiges: 0,
    aRestituerCetteSemaine: 0,
    totalDossiers: 0
  })
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('TOUS')
  const [modaleNouveau, setModaleNouveau] = useState(false)
  const [cautionEnGestion, setCautionEnGestion] = useState<CautionComplete | null>(null)
  const [apercuPdf, setApercuPdf] = useState<{ numero: string; urlPdf: string } | null>(null)

  const chargerCautions = useCallback(async () => {
    try {
      setChargement(true)
      const params = new URLSearchParams()
      if (recherche) params.set('recherche', recherche)
      if (statutFiltre && statutFiltre !== 'TOUS') params.set('statut', statutFiltre)

      const rep = await fetch(`/api/cautions?${params.toString()}`)
      const data = await rep.json()
      if (data.succes) {
        setCautions(data.donnees)
        if (data.kpis) setKpis(data.kpis)
      }
    } catch (err) {
      console.error('[Page Cautions] Erreur chargement:', err)
    } finally {
      setChargement(false)
    }
  }, [recherche, statutFiltre])

  useEffect(() => {
    chargerCautions()
  }, [chargerCautions])

  const ouvrirApercuPdf = (cautionId: string) => {
    const caution = cautions.find(c => c.id === cautionId) || cautionEnGestion
    const num = caution ? `CAU-${caution.id.slice(-6).toUpperCase()}` : 'Caution'
    setApercuPdf({
      numero: num,
      urlPdf: `/api/cautions/${cautionId}/pdf`
    })
  }

  return (
    <main className={styles.conteneur}>
      {/* En-tête principal */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>
            ← Accueil
          </Link>
          <div className={styles.titreModule}>
            <span>🛡️</span>
            <h1>Cautions &amp; Dépôts de Garantie</h1>
          </div>
        </div>

        <button className={styles.boutonAjouter} onClick={() => setModaleNouveau(true)}>
          + Enregistrer une caution
        </button>
      </header>

      {/* Bannière Règle Comptable Légale */}
      <div className={styles.banniereComptable}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <div>
          <strong>Séparation Comptable Stricte (Hors Chiffre d&apos;Affaires) :</strong> Les cautions et dépôts de garantie encaissés ou conservés en coffre sont des dettes/engagements envers les tiers. Ils ne sont <em>jamais</em> comptabilisés dans le Chiffre d&apos;Affaires (CA) d&apos;Isy Lok, sauf retenue définitive pour dégradation ou casse constatée.
        </div>
      </div>

      {/* 3 KPIs Stratégiques demandés */}
      <section className={styles.statsRapides}>
        {/* KPI 1 : Total cautions en cours */}
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Total cautions en cours</span>
            <span className={styles.carteStatIcone}>🛡️</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#2dd4bf' }}>
            {formaterPrix(kpis.totalCautionsEnCours)}
          </div>
          <div className={styles.carteStatSous}>
            Garanties actives en coffre ou empreintes CB
          </div>
        </div>

        {/* KPI 2 : Alertes litiges / casse atelier */}
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Alertes litiges &amp; casse atelier</span>
            <span className={styles.carteStatIcone}>⚠️</span>
          </div>
          <div
            className={styles.carteStatValeur}
            style={{ color: kpis.alertesLitiges > 0 ? '#f87171' : '#34d399' }}
          >
            {kpis.alertesLitiges}
          </div>
          <div className={styles.carteStatSous}>
            {kpis.alertesLitiges > 0
              ? 'Dossiers avec signalements de casse à solder'
              : 'Aucun litige de casse en suspens'}
          </div>
        </div>

        {/* KPI 3 : Cautions à restituer cette semaine */}
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>À restituer cette semaine</span>
            <span className={styles.carteStatIcone}>⏱️</span>
          </div>
          <div
            className={styles.carteStatValeur}
            style={{ color: kpis.aRestituerCetteSemaine > 0 ? '#fbbf24' : '#94a3b8' }}
          >
            {kpis.aRestituerCetteSemaine}
          </div>
          <div className={styles.carteStatSous}>
            Événements récents achevés à clôturer
          </div>
        </div>
      </section>

      {/* Tableau et gestion des cautions */}
      {chargement && cautions.length === 0 ? (
        <div className={styles.etatVide}>
          <div className={styles.etatVideIcone}>⏳</div>
          <h3>Chargement des dossiers de cautions…</h3>
        </div>
      ) : (
        <TableauCautions
          cautions={cautions}
          recherche={recherche}
          onChangerRecherche={setRecherche}
          statutFiltre={statutFiltre}
          onChangerStatutFiltre={setStatutFiltre}
          onGerer={c => setCautionEnGestion(c)}
          onApercuPdf={ouvrirApercuPdf}
        />
      )}

      {/* Modale Nouveau Dépôt de Garantie */}
      {modaleNouveau && (
        <ModaleNouvelleCaution
          onFermer={() => setModaleNouveau(false)}
          onCree={() => chargerCautions()}
        />
      )}

      {/* Modale Gestion de la Caution & Litiges Atelier */}
      {cautionEnGestion && (
        <ModaleGestionCaution
          caution={cautionEnGestion}
          onFermer={() => setCautionEnGestion(null)}
          onSauvegarder={() => chargerCautions()}
          onOuvrirPdf={ouvrirApercuPdf}
        />
      )}

      {/* Modale Prévisualisation PDF */}
      {apercuPdf && (
        <ModaleApercuCautionPdf
          numero={apercuPdf.numero}
          urlPdf={apercuPdf.urlPdf}
          onFermer={() => setApercuPdf(null)}
        />
      )}
    </main>
  )
}
