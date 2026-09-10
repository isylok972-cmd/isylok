'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './direction.module.css'
import { formaterPrix } from '@/lib/utilitaires'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

export default function PageDirection() {
  const [stats, setStats] = useState<any>(null)
  const [chargement, setChargement] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Vérification du rôle côté client
    const cookies = document.cookie.split('; ')
    const roleCookie = cookies.find(row => row.startsWith('isylok_role='))
    if (roleCookie) {
      const role = roleCookie.split('=')[1]
      if (role === 'LIVREUR') {
        router.push('/')
        return
      }
    }

    fetch('/api/direction/statistiques')
      .then(r => r.json())
      .then(data => {
        if (data.succes) setStats(data.donnees)
        setChargement(false)
      })
      .catch(() => setChargement(false))
  }, [])

  if (chargement) return <div className={styles.conteneur}><p style={{color: '#94a3b8', textAlign: 'center', marginTop: 100}}>⏳ Chargement du cockpit...</p></div>

  const { caMensuel, margeData, topMateriel, kpi } = stats || { caMensuel: [], margeData: [], topMateriel: [], kpi: {} }

  const COULEURS_PIE = ['#fbbf24', '#cbd5e1']

  // Tooltip custom pour le CA
  const CustomTooltipCA = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(18, 18, 42, 0.9)', border: '1px solid #fbbf24', padding: '10px', borderRadius: '8px' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 5px 0', fontSize: 12 }}>{label}</p>
          <p style={{ color: '#fbbf24', margin: 0, fontWeight: 700 }}>{formaterPrix(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  // Tooltip custom pour la Marge
  const CustomTooltipMarge = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(18, 18, 42, 0.9)', border: '1px solid #fbbf24', padding: '10px', borderRadius: '8px' }}>
          <p style={{ color: '#f1f5f9', margin: '0 0 5px 0', fontSize: 13, fontWeight: 600 }}>{payload[0].name}</p>
          <p style={{ color: payload[0].name === 'Marge Nette' ? '#fbbf24' : '#cbd5e1', margin: 0, fontWeight: 700 }}>{formaterPrix(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>📊</span>
            <h1>Direction &amp; Statistiques (Le Cockpit)</h1>
          </div>
        </div>
      </header>

      <div className={styles.kpiGrille}>
        <div className={styles.carteKpi}>
          <div className={styles.kpiLabel}>Chiffre d'Affaires HT (Annuel)</div>
          <div className={styles.kpiValeur} style={{ color: '#fbbf24' }}>{formaterPrix(kpi.totalCA)}</div>
          <div className={styles.kpiSous}>Cumul facturé</div>
        </div>
        <div className={styles.carteKpi}>
          <div className={styles.kpiLabel}>Marge Nette Estimée</div>
          <div className={styles.kpiValeur}>{formaterPrix(kpi.marge)}</div>
          <div className={styles.kpiSous}>{kpi.margePourcentage.toFixed(1)}% du CA</div>
        </div>
        <div className={styles.carteKpi}>
          <div className={styles.kpiLabel}>TVA Collectée à Reverser</div>
          <div className={styles.kpiValeur} style={{ color: '#f87171' }}>{formaterPrix(kpi.totalTVA)}</div>
          <div className={styles.kpiSous}>TVA due à l'État</div>
        </div>
        <div className={styles.carteKpi}>
          <div className={styles.kpiLabel}>Total Achats &amp; Sous-loc</div>
          <div className={styles.kpiValeur} style={{ color: '#cbd5e1' }}>{formaterPrix(kpi.totalCA - kpi.marge)}</div>
          <div className={styles.kpiSous}>Dépenses liées au matériel</div>
        </div>
      </div>

      <div className={styles.grilleGraphiques}>
        
        {/* CA Mensuel */}
        <div className={styles.panneauGraphique}>
          <h2 className={styles.graphiqueTitre}>📈 Évolution du CA Mensuel (HT)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={caMensuel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k€`} />
                <Tooltip content={<CustomTooltipCA />} cursor={{ fill: 'rgba(251, 191, 36, 0.05)' }} />
                <Bar dataKey="CA" fill="url(#colorCa)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <defs>
                  <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagramme Marge */}
        <div className={styles.panneauGraphique}>
          <h2 className={styles.graphiqueTitre}>📊 Répartition CA / Dépenses</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={margeData} cx="50%" cy="45%" innerRadius={60} outerRadius={80}
                  paddingAngle={5} dataKey="value" stroke="none"
                >
                  {margeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COULEURS_PIE[index % COULEURS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipMarge />} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className={styles.grilleGraphiques} style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
        {/* Top 5 */}
        <div className={styles.panneauGraphique}>
          <h2 className={styles.graphiqueTitre}>🏆 Top 5 Matériel le plus loué</h2>
          {topMateriel.length > 0 ? (
            <ul className={styles.listeTop}>
              {topMateriel.map((mat: any, index: number) => (
                <li key={index} className={styles.itemTop}>
                  <div className={styles.itemTopNum}>{index + 1}</div>
                  <div className={styles.itemTopNom}>{mat.nom}</div>
                  <div className={styles.itemTopQte}>{mat.quantite} loués</div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Aucune donnée de location validée.</div>
          )}
        </div>
      </div>
      
    </main>
  )
}
