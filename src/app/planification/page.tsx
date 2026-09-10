'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './planification.module.css'
import { formaterDate } from '@/lib/utilitaires'

export default function PagePlanification() {
  const [devisAPlanifier, setDevisAPlanifier] = useState<any[]>([])
  const [tournees, setTournees] = useState<any[]>([])
  const [livreurs, setLivreurs] = useState<any[]>([])
  
  const [selection, setSelection] = useState<string[]>([])
  const [modale, setModale] = useState(false)
  
  const [livreurId, setLivreurId] = useState('')
  const [date, setDate] = useState('')

  const chargerDonnees = async () => {
    try {
      const rep = await fetch('/api/planification/tournees')
      const data = await rep.json()
      if (data.succes) {
        setDevisAPlanifier(data.donnees.devisAPlanifier)
        setTournees(data.donnees.tournees)
      }
      
      // Simuler la récupération des livreurs (on prend tous les users pour simplifier sans auth)
      // Normalement on filtrerait sur role='LIVREUR'
      const repUsers = await fetch('/api/administration/parametres') // hack: on va chercher ailleurs ou utiliser une liste statique
    } catch (err) { console.error(err) }
  }

  // Liste statique de livreurs pour la démo
  useEffect(() => {
    setLivreurs([
      { id: 'usr-livreur-1', nom: 'Martin', prenom: 'Lucas' },
      { id: 'usr-livreur-2', nom: 'Bernard', prenom: 'Paul' }
    ])
    chargerDonnees()
  }, [])

  const toggleSelection = (id: string) => {
    setSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const creerTournee = async () => {
    if (!livreurId || !date || selection.length === 0) return
    try {
      const rep = await fetch('/api/planification/tournees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livreurId, date, devisIds: selection })
      })
      const data = await rep.json()
      if (data.succes) {
        setModale(false)
        setSelection([])
        chargerDonnees()
      }
    } catch (err) { console.error(err) }
  }

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>🗺️</span>
            <h1>Planification des Tournées</h1>
          </div>
        </div>
      </header>

      <div className={styles.grillePlanification}>
        
        {/* Colonne 1 : Livraisons à prévoir */}
        <div className={styles.panneau}>
          <h2 className={styles.panneauTitre}>📦 Livraisons à prévoir ({devisAPlanifier.length})</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Sélectionnez les livraisons à grouper dans une tournée.</p>
          
          {devisAPlanifier.map(d => (
            <div 
              key={d.id} 
              className={`${styles.carteLivraison} ${selection.includes(d.id) ? styles.carteLivraisonActive : ''}`}
              onClick={() => toggleSelection(d.id)}
            >
              <div className={styles.carteLivraisonEntete}>
                <span className={styles.livraisonClient}>{d.client.prenom ? `${d.client.prenom} ${d.client.nom}` : d.client.nom}</span>
                <span className={styles.livraisonNum}>{d.numero}</span>
              </div>
              <div className={styles.livraisonAdresse}>
                📍 {d.lieuEvenement || d.client.adresse || 'Adresse à préciser'}
              </div>
              <div className={styles.livraisonAdresse}>
                📅 Prévu le : {d.dateEvenement ? formaterDate(d.dateEvenement) : 'Non défini'}
              </div>
            </div>
          ))}

          {devisAPlanifier.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              Aucune livraison en attente.
            </div>
          )}

          {selection.length > 0 && (
            <button className={styles.boutonAssocier} onClick={() => setModale(true)}>
              📅 Assigner {selection.length} livraison(s) à un livreur
            </button>
          )}
        </div>

        {/* Colonne 2 : Tournées planifiées */}
        <div className={styles.panneau}>
          <h2 className={styles.panneauTitre}>🚚 Tournées Planifiées</h2>
          
          {tournees.map(t => (
            <div key={t.id} className={styles.tourneeCarte}>
              <div className={styles.tourneeEntete}>
                <div>
                  <span className={styles.tourneeLivreur}>Livreur : {t.livreur?.prenom} {t.livreur?.nom || 'Inconnu'}</span>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Date : {formaterDate(t.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12 }}>
                  {t.numero}
                </span>
              </div>
              
              <div>
                {t.etapes.map((etape: any) => (
                  <div key={etape.id} className={styles.etapeCarte}>
                    <div className={styles.etapeOrdre}>{etape.ordre}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{etape.devis?.client?.nom || 'Client'}</div>
                      <div style={{ color: '#94a3b8' }}>{etape.adresse}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tournees.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>🚚</span>
              Aucune tournée planifiée pour le moment.
            </div>
          )}
        </div>

      </div>

      {modale && (
        <>
          <div className={styles.overlay} onClick={() => setModale(false)} />
          <div className={styles.modale}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, color: '#f1f5f9', margin: 0 }}>Planifier la tournée</h2>
              <button onClick={() => setModale(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            <div className={styles.champGroupe}>
              <label>Assigner au Livreur *</label>
              <select value={livreurId} onChange={e => setLivreurId(e.target.value)} required>
                <option value="">-- Choisir un livreur --</option>
                {livreurs.map(l => <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
              </select>
            </div>
            
            <div className={styles.champGroupe}>
              <label>Date de la tournée *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <button 
              className={styles.boutonAssocier} 
              style={{ marginTop: 24 }} 
              onClick={creerTournee}
              disabled={!livreurId || !date}
            >
              ✅ Confirmer la tournée
            </button>
          </div>
        </>
      )}

    </main>
  )
}
