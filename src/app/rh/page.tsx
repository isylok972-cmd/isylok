'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './rh.module.css'

export default function PageRH() {
  const [heure, setHeure] = useState('')
  const [dateDuJour, setDateDuJour] = useState('')
  const [employes, setEmployes] = useState<any[]>([])
  const [employeActif, setEmployeActif] = useState('')
  
  const [pointages, setPointages] = useState<any[]>([])
  
  const [chargementGPS, setChargementGPS] = useState(false)
  const [gpsStatut, setGpsStatut] = useState<'attente'|'ok'|'erreur'>('attente')

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setHeure(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    
    setDateDuJour(new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    
    return () => clearInterval(timer)
  }, [])

  // Chargement des données
  const chargerDonnees = async () => {
    try {
      const repUsers = await fetch('/api/administration/utilisateurs')
      const dataUsers = await repUsers.json()
      if (dataUsers.succes && dataUsers.donnees && dataUsers.donnees.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEmployes(dataUsers.donnees.map((u: any) => ({
          id: u.id,
          nom: `${u.nom} ${u.prenom}`.trim(),
          role: u.role
        })))
      } else {
        setEmployes([
          { id: 'usr-livreur-1', nom: 'Martin Lucas', role: 'LIVREUR' },
          { id: 'usr-livreur-2', nom: 'Petit Thomas', role: 'LIVREUR' },
          { id: 'usr-sec-1', nom: 'Dupont Marie', role: 'SECRETAIRE' },
          { id: 'usr-admin-1', nom: 'Administrateur', role: 'ADMIN' },
          { id: 'usr-atelier-1', nom: 'Opérateur Atelier', role: 'OPERATEUR_ATELIER' }
        ])
      }
      
      const rep = await fetch('/api/rh/pointages')
      const data = await rep.json()
      if (data.succes) setPointages(data.donnees)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { chargerDonnees() }, [])

  const pointer = async (type: 'DEBUT' | 'FIN') => {
    if (!employeActif) return alert("Sélectionnez votre profil d'abord.")
    
    setChargementGPS(true)
    
    // Obtenir la position GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setGpsStatut('ok')
          await envoyerPointage(type, position.coords.latitude, position.coords.longitude)
        },
        async (error) => {
          setGpsStatut('erreur')
          // On autorise le pointage même sans GPS, mais on le signale
          await envoyerPointage(type, null, null)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    } else {
      setGpsStatut('erreur')
      await envoyerPointage(type, null, null)
    }
  }

  const envoyerPointage = async (type: string, lat: number | null, lng: number | null) => {
    try {
      const rep = await fetch('/api/rh/pointages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilisateurId: employeActif,
          type,
          latitudeGps: lat,
          longitudeGps: lng
        })
      })
      const data = await rep.json()
      if (data.succes) {
        chargerDonnees() // Refresh
      }
    } catch (e) { console.error(e) }
    setChargementGPS(false)
  }

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>⏱️</span>
            <h1>RH &amp; Pointage</h1>
          </div>
        </div>
      </header>

      <div className={styles.pointeuseBox}>
        <div className={styles.horloge}>{heure || '00:00:00'}</div>
        <div className={styles.dateAujourdhui}>{dateDuJour}</div>
        
        <select 
          value={employeActif} 
          onChange={e => setEmployeActif(e.target.value)}
          style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(249,115,22,0.3)', marginBottom: 24 }}
        >
          <option value="">👤 Je suis...</option>
          {employes.map(e => <option key={e.id} value={e.id}>{e.nom} ({e.role})</option>)}
        </select>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button 
            className={`${styles.boutonPointeuse} ${styles.boutonDebut} ${(!employeActif || chargementGPS) ? styles.boutonBloque : ''}`} 
            onClick={() => pointer('DEBUT')}
            disabled={!employeActif || chargementGPS}
          >
            <span>▶️</span>
            <span>Début</span>
          </button>
          
          <button 
            className={`${styles.boutonPointeuse} ${styles.boutonFin} ${(!employeActif || chargementGPS) ? styles.boutonBloque : ''}`} 
            onClick={() => pointer('FIN')}
            disabled={!employeActif || chargementGPS}
          >
            <span>⏹️</span>
            <span>Fin</span>
          </button>
        </div>

        <div className={styles.gpsStatus}>
          {chargementGPS ? '📍 Acquisition GPS en cours...' : 
           gpsStatut === 'ok' ? <span className={styles.gpsActive}>📍 Position GPS enregistrée</span> :
           gpsStatut === 'erreur' ? <span className={styles.gpsError}>⚠️ Position GPS introuvable</span> :
           '📍 Le GPS sera activé au pointage'}
        </div>
      </div>

      <div className={styles.dashboardAdmin}>
        <h2 className={styles.dashboardTitre}>📋 Historique des Pointages (Vue Admin)</h2>
        <table className={styles.tableau}>
          <thead>
            <tr>
              <th>Employé</th>
              <th>Date / Heure</th>
              <th>Action</th>
              <th>Localisation</th>
            </tr>
          </thead>
          <tbody>
            {pointages.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.utilisateur?.prenom} {p.utilisateur?.nom}</td>
                <td>{new Date(p.horodatage).toLocaleString('fr-FR')}</td>
                <td>
                  <span className={`${styles.badgeType} ${p.type === 'DEBUT' ? styles.typeDebut : styles.typeFin}`}>
                    {p.type === 'DEBUT' ? 'Début de service' : 'Fin de service'}
                  </span>
                </td>
                <td>
                  {p.latitudeGps ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${p.latitudeGps},${p.longitudeGps}`} target="_blank" rel="noreferrer" className={styles.lienGps}>
                      🌍 Voir sur la carte
                    </a>
                  ) : 'Non localisé'}
                </td>
              </tr>
            ))}
            {pointages.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Aucun pointage aujourd'hui.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </main>
  )
}
