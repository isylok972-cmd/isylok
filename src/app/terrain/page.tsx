'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import styles from './terrain.module.css'
import ScannerCamera from '@/composants/ScannerCamera'

interface UtilisateurSession {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
}

interface PointageActif {
  id: string
  heureDebut: string
  gpsDebut?: string | null
  heureFin?: string | null
  totalHeures?: number | null
  notes?: string | null
}

interface LigneDevisItem {
  id: string
  designation: string
  quantite: number
}

interface EtapeTournee {
  id: string
  ordre: number
  type: string // LIVRAISON, REPRISE
  adresse: string
  codePostal?: string | null
  ville?: string | null
  statut: string // EN_ATTENTE, EN_ROUTE, SUR_PLACE, TERMINEE
  heureEstimee?: string | null
  devisId?: string | null
  devis?: {
    id: string
    numero: string
    signatureLivraison?: string | null
    dateSignatureLivraison?: string | null
    photosAnomalies?: string | null
    client?: {
      nom: string
      prenom?: string | null
      telephone?: string | null
      ville?: string | null
    } | null
    lignes?: LigneDevisItem[]
  } | null
}

export default function PageTerrain() {
  const [sessionUser, setSessionUser] = useState<UtilisateurSession | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [chargementAuth, setChargementAuth] = useState(true)

  // Pointeuse
  const [pointageActif, setPointageActif] = useState<PointageActif | null>(null)
  const [chargementPointage, setChargementPointage] = useState(false)
  const [coordsGpsActuel, setCoordsGpsActuel] = useState<string | null>(null)
  const [messagePointage, setMessagePointage] = useState<string | null>(null)

  // Feuille de route
  const [etapes, setEtapes] = useState<EtapeTournee[]>([])
  const [chargementMissions, setChargementMissions] = useState(true)
  const [numeroTournee, setNumeroTournee] = useState<string>('')

  // Scanner caméra
  const [scannerOuvert, setScannerOuvert] = useState(false)
  const [codeScanneAlerte, setCodeScanneAlerte] = useState<string | null>(null)

  // Modale Signature Dépose
  const [etapePourSignature, setEtapePourSignature] = useState<EtapeTournee | null>(null)
  const [nomSignataire, setNomSignataire] = useState('')
  const [signatureEnregistree, setSignatureEnregistree] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const estEnTrainDeDessiner = useRef(false)

  // Modale Reprise / Anomalies
  const [etapePourReprise, setEtapePourReprise] = useState<EtapeTournee | null>(null)
  const [articleCasseNom, setArticleCasseNom] = useState('')
  const [quantiteCasse, setQuantiteCasse] = useState(1)
  const [commentaireReprise, setCommentaireReprise] = useState('')
  const [photosAnomalies, setPhotosAnomalies] = useState<string[]>([])
  const [chargementValidation, setChargementValidation] = useState(false)

  // 1. Initialiser la session et les permissions
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.succes && res.donnees) {
          setRole(res.donnees.role)
          setSessionUser(res.donnees.utilisateur)
        }
        setChargementAuth(false)
      })
      .catch(() => setChargementAuth(false))
  }, [])

  // 2. Récupérer l'état de pointage
  const rafraichirPointage = useCallback(() => {
    fetch('/api/livreur/pointage')
      .then((r) => r.json())
      .then((res) => {
        if (res.succes && res.donnees) {
          setPointageActif(res.donnees.pointageActif)
        }
      })
      .catch((err) => console.error('Erreur chargement pointage:', err))
  }, [])

  // 3. Récupérer la feuille de route
  const rafraichirMissions = useCallback(() => {
    setChargementMissions(true)
    fetch('/api/livreur/livraison')
      .then((r) => r.json())
      .then((res) => {
        if (res.succes && res.donnees) {
          const t = res.donnees.tourneePrincipale
          if (t) {
            setNumeroTournee(t.numero)
            setEtapes(t.etapes || [])
          } else if (res.donnees.devisDuJour && res.donnees.devisDuJour.length > 0) {
            // Conversion directe des devis du jour en arrêts
            const etapesDirectes: EtapeTournee[] = res.donnees.devisDuJour.map(
              (d: { id: string; numero: string; lieuEvenement?: string; client: { nom: string; prenom?: string; telephone?: string; codePostal?: string; ville?: string; adresse?: string }; signatureLivraison?: string; dateSignatureLivraison?: string; photosAnomalies?: string; lignes?: LigneDevisItem[] }, index: number) => ({
                id: `direct-${d.id}`,
                ordre: index + 1,
                type: 'LIVRAISON',
                adresse: d.lieuEvenement || d.client?.adresse || 'Adresse du devis',
                codePostal: d.client?.codePostal,
                ville: d.client?.ville,
                statut: d.signatureLivraison ? 'TERMINEE' : 'EN_ATTENTE',
                devisId: d.id,
                devis: d,
              })
            )
            setNumeroTournee('Missions Directes')
            setEtapes(etapesDirectes)
          } else {
            setEtapes([])
          }
        }
        setChargementMissions(false)
      })
      .catch(() => setChargementMissions(false))
  }, [])

  useEffect(() => {
    rafraichirPointage()
    rafraichirMissions()

    // Tenter de récupérer la position GPS au démarrage
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordsGpsActuel(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`)
        },
        () => {
          // GPS silencieusement indisponible
        },
        { timeout: 8000 }
      )
    }
  }, [rafraichirPointage, rafraichirMissions])

  // Prise de poste / Fin de journée
  const pointerHeure = async (action: 'DEBUT' | 'FIN') => {
    setChargementPointage(true)
    setMessagePointage(null)

    // Obtenir coordonnées fraîches
    let gpsStr = coordsGpsActuel
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { timeout: 5000, enableHighAccuracy: true }
          )
        })
        if (position) {
          gpsStr = `${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`
          setCoordsGpsActuel(gpsStr)
        }
      } catch {
        // Fallback GPS
      }
    }

    try {
      const res = await fetch('/api/livreur/pointage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, gps: gpsStr }),
      })
      const data = await res.json()
      if (data.succes) {
        setMessagePointage(data.message)
        rafraichirPointage()
      } else {
        setMessagePointage(`⚠️ ${data.message}`)
      }
    } catch {
      setMessagePointage('⚠️ Erreur de communication réseau.')
    } finally {
      setChargementPointage(false)
    }
  }

  // Gestion du Scan Caméra
  const gererScan = (code: string) => {
    setCodeScanneAlerte(`Code détecté : ${code}`)

    // Chercher un arrêt dont le devis ou numéro correspond
    const etapeTrouvee = etapes.find(
      (e) =>
        e.devis?.numero.toLowerCase() === code.toLowerCase() ||
        e.devisId === code ||
        e.id === code
    )

    if (etapeTrouvee) {
      setCodeScanneAlerte(`🎯 Arrêt #${etapeTrouvee.ordre} identifié pour ${etapeTrouvee.devis?.numero || code} !`)
      setScannerOuvert(false)

      // Scroller vers la carte de l'étape
      const elem = document.getElementById(`etape-${etapeTrouvee.id}`)
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Initialisation du canvas de signature
  const initialiserCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Haute résolution canvas
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (etapePourSignature) {
      setTimeout(initialiserCanvas, 100)
    }
  }, [etapePourSignature, initialiserCanvas])

  const effacerSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEnregistree(false)
  }

  const demarrerDessin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    estEnTrainDeDessiner.current = true
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const dessiner = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!estEnTrainDeDessiner.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setSignatureEnregistree(true)
  }

  const arreterDessin = () => {
    estEnTrainDeDessiner.current = false
  }

  // Validation de l'émargement client
  const validerEmargement = async () => {
    if (!etapePourSignature || !canvasRef.current) return
    setChargementValidation(true)

    const signatureDataUrl = canvasRef.current.toDataURL('image/png')
    const devisId = etapePourSignature.devisId || (etapePourSignature.id.startsWith('direct-') ? etapePourSignature.id.replace('direct-', '') : null)

    try {
      const res = await fetch('/api/livreur/livraison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIGNATURE',
          etapeId: etapePourSignature.id.startsWith('direct-') ? null : etapePourSignature.id,
          devisId,
          signatureBase64: signatureDataUrl,
          signataireNom: nomSignataire || 'Client Réceptionnaire',
          gps: coordsGpsActuel,
        }),
      })

      const data = await res.json()
      if (data.succes) {
        setEtapePourSignature(null)
        setNomSignataire('')
        rafraichirMissions()
      } else {
        alert(data.message || 'Erreur lors de la validation')
      }
    } catch (e) {
      console.error(e)
      alert('Erreur réseau lors de la signature.')
    } finally {
      setChargementValidation(false)
    }
  }

  // Prise de photo caméra pour les anomalies
  const ajouterPhotoAnomalie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setPhotosAnomalies((prev) => [...prev, ev.target!.result as string])
      }
    }
    reader.readAsDataURL(file)
  }

  // Validation reprise / casses
  const validerReprise = async () => {
    if (!etapePourReprise) return
    setChargementValidation(true)

    const devisId = etapePourReprise.devisId || (etapePourReprise.id.startsWith('direct-') ? etapePourReprise.id.replace('direct-', '') : null)

    const listeAnomalies = []
    if (articleCasseNom || commentaireReprise || photosAnomalies.length > 0) {
      listeAnomalies.push({
        articleNom: articleCasseNom || 'Article retourné',
        quantite: quantiteCasse,
        description: commentaireReprise || 'Anomalie / Casse signalée',
        photoUrl: photosAnomalies[0] || '',
        photos: photosAnomalies,
      })
    }

    try {
      const res = await fetch('/api/livreur/livraison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPRISE',
          etapeId: etapePourReprise.id.startsWith('direct-') ? null : etapePourReprise.id,
          devisId,
          anomalies: listeAnomalies,
          gps: coordsGpsActuel,
        }),
      })

      const data = await res.json()
      if (data.succes) {
        setEtapePourReprise(null)
        setArticleCasseNom('')
        setCommentaireReprise('')
        setPhotosAnomalies([])
        rafraichirMissions()
      } else {
        alert(data.message || 'Erreur enregistrement reprise')
      }
    } catch {
      alert('Erreur réseau lors de la reprise.')
    } finally {
      setChargementValidation(false)
    }
  }

  // Mise à jour de statut étape optionnelle
  const basculerStatutEtape = async (etapeId: string, statutActuel: string) => {
    if (etapeId.startsWith('direct-')) return
    const nouveauStatut = statutActuel === 'SUR_PLACE' ? 'TERMINEE' : statutActuel === 'EN_ROUTE' ? 'SUR_PLACE' : 'EN_ROUTE'
    try {
      await fetch('/api/livreur/livraison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STATUT_ETAPE',
          etapeId,
          nouveauStatut,
        }),
      })
      rafraichirMissions()
    } catch (err) {
      console.warn('Erreur mise à jour statut:', err)
    }
  }

  // Contrôle des rôles autorisés (ADMIN et LIVREUR)
  if (chargementAuth) {
    return (
      <div className={styles.conteneurTerrain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>⏳ Chargement de l&apos;espace mobile...</p>
      </div>
    )
  }

  const roleEstAutorise = role === 'ADMIN' || role === 'LIVREUR'

  if (!roleEstAutorise) {
    return (
      <div className={styles.conteneurTerrain}>
        <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '440px', margin: '0 auto' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Accès Réservé aux Livreurs</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
            Cet espace mobile de pointage et de livraison est accessible aux profils <strong>LIVREUR</strong> et <strong>ADMIN</strong>.
          </p>
          <Link
            href="/connexion"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Se connecter en tant que Livreur
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.conteneurTerrain}>
      {/* Barre supérieure fixe mobile */}
      <header className={styles.enteteFixe}>
        <div className={styles.marqueLogo}>
          <Link href="/" style={{ color: '#ffffff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📦</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>Isy Lok</span>
          </Link>
          <span className={styles.badgeLivreur}>{role === 'ADMIN' ? 'Admin / Terrain' : 'Livreur'}</span>
        </div>

        <button
          type="button"
          onClick={() => setScannerOuvert(true)}
          className={styles.boutonScannerHaut}
          aria-label="Ouvrir le scanner caméra"
        >
          <span>📷</span> Scan
        </button>
      </header>

      <main className={styles.contenuPrincipal}>
        {/* Toast ou Notification de scan */}
        {codeScanneAlerte && (
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#f0f9ff',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{codeScanneAlerte}</span>
            <button
              onClick={() => setCodeScanneAlerte(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. POINTEUSE D'HEURES GPS INDÉPENDANTE */}
        <section className={styles.cartePointeuse} aria-label="Pointeuse d'heures GPS">
          <div className={styles.pointeuseEntete}>
            <div className={styles.pointeuseTitre}>
              <span>⏱️</span> Pointeuse d&apos;Heures Livreur
            </div>
            {pointageActif ? (
              <div className={`${styles.badgeStatutService} ${styles.statutActif}`}>
                <span className={styles.pointPulsant} />
                En poste depuis{' '}
                {new Date(pointageActif.heureDebut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : (
              <div className={`${styles.badgeStatutService} ${styles.statutInactif}`}>
                Hors service / En pause
              </div>
            )}
          </div>

          <div className={styles.infoGps}>
            <span>
              📍 GPS : {coordsGpsActuel ? coordsGpsActuel : 'Localisation en cours...'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Autonome & Indépendant</span>
          </div>

          {messagePointage && (
            <div style={{ fontSize: '0.82rem', color: '#38bdf8', marginBottom: '12px', fontWeight: 600 }}>
              {messagePointage}
            </div>
          )}

          <div className={styles.grilleBoutonsPointage}>
            <button
              type="button"
              onClick={() => pointerHeure('DEBUT')}
              disabled={chargementPointage || pointageActif !== null}
              className={styles.boutonPrisePoste}
            >
              <span style={{ fontSize: '1.2rem' }}>🟢</span>
              <span>Prise de poste</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.9 }}>Horodatage + GPS</span>
            </button>

            <button
              type="button"
              onClick={() => pointerHeure('FIN')}
              disabled={chargementPointage || pointageActif === null}
              className={styles.boutonFinPoste}
            >
              <span style={{ fontSize: '1.2rem' }}>🔴</span>
              <span>Fin de journée</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.9 }}>Clôture & Total</span>
            </button>
          </div>
        </section>

        {/* 2. TOURNÉE DU JOUR & FEUILLE DE ROUTE */}
        <section className={styles.sectionTournee} aria-label="Feuille de route du jour">
          <div className={styles.titreSection}>
            <span>🗺️ Tournée du Jour</span>
            <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
              {numeroTournee || "Aujourd'hui"}
            </span>
          </div>
          <div className={styles.sousTitreSection}>
            {etapes.length > 0
              ? `${etapes.length} mission(s) programmée(s)`
              : 'Aucune livraison assignée pour l’instant'}
          </div>

          {chargementMissions ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              ⏳ Chargement de la feuille de route...
            </div>
          ) : etapes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#111827', borderRadius: '16px' }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🌴</span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>Aucune étape planifiée</div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Vous pouvez quand même pointer votre journée indépendamment via la pointeuse ci-dessus.
              </p>
            </div>
          ) : (
            <div>
              {etapes.map((etape) => {
                const client = etape.devis?.client
                const nomClientAffiche = client ? (client.prenom ? `${client.prenom} ${client.nom}` : client.nom) : 'Client particulier'
                const adresseComplete = `${etape.adresse}, ${etape.codePostal || ''} ${etape.ville || ''}`
                const adresseEncodée = encodeURIComponent(adresseComplete)
                const lienMaps = `https://www.google.com/maps/search/?api=1&query=${adresseEncodée}`
                const lienWaze = `https://waze.com/ul?q=${adresseEncodée}&navigate=yes`
                const estTerminee = etape.statut === 'TERMINEE' || Boolean(etape.devis?.signatureLivraison)

                return (
                  <article
                    key={etape.id}
                    id={`etape-${etape.id}`}
                    className={`${styles.carteEtape} ${estTerminee ? styles.carteEtapeTerminee : ''}`}
                  >
                    <div className={styles.etapeBandeauHaut}>
                      <span className={etape.type === 'REPRISE' ? styles.typeBadgeReprise : styles.typeBadgeLivraison}>
                        Arrêt #{etape.ordre} • {etape.type}
                      </span>

                      {/* Statut d'étape souple */}
                      <button
                        type="button"
                        onClick={() => basculerStatutEtape(etape.id, etape.statut)}
                        className={styles.badgeStatutEtape}
                        style={{
                          background:
                            etape.statut === 'SUR_PLACE'
                              ? '#0284c7'
                              : etape.statut === 'EN_ROUTE'
                              ? '#f59e0b'
                              : estTerminee
                              ? '#059669'
                              : '#334155',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {etape.statut === 'SUR_PLACE'
                          ? '📍 Sur place'
                          : etape.statut === 'EN_ROUTE'
                          ? '🚚 En route'
                          : estTerminee
                          ? '✓ Validé'
                          : 'En attente'}
                      </button>
                    </div>

                    <div className={styles.etapeNomClient}>{nomClientAffiche}</div>

                    {etape.devis?.numero && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
                        Devis : <strong>{etape.devis.numero}</strong>
                      </div>
                    )}

                    {client?.telephone && (
                      <div className={styles.etapeTelephone}>
                        <a href={`tel:${client.telephone}`} className={styles.lienAppel}>
                          <span>📞</span> Appeler {client.telephone}
                        </a>
                      </div>
                    )}

                    <div className={styles.etapeAdresse}>
                      📍 {etape.adresse}
                      {(etape.codePostal || etape.ville) && (
                        <div>
                          {etape.codePostal} {etape.ville}
                        </div>
                      )}
                    </div>

                    {/* Raccourcis GPS Waze / Google Maps */}
                    <div className={styles.actionsItineraire}>
                      <a href={lienMaps} target="_blank" rel="noopener noreferrer" className={styles.boutonMaps}>
                        🗺️ Google Maps
                      </a>
                      <a href={lienWaze} target="_blank" rel="noopener noreferrer" className={styles.boutonWaze}>
                        🚗 Waze
                      </a>
                    </div>

                    {/* Aperçu des articles */}
                    {etape.devis?.lignes && etape.devis.lignes.length > 0 && (
                      <div className={styles.zoneArticles}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                          Matériel à {etape.type === 'REPRISE' ? 'reprendre' : 'déposer'} :
                        </div>
                        {etape.devis.lignes.slice(0, 3).map((lig) => (
                          <div key={lig.id} className={styles.ligneArticleMini}>
                            <span>• {lig.designation}</span>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>x{lig.quantite}</span>
                          </div>
                        ))}
                        {etape.devis.lignes.length > 3 && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                            + {etape.devis.lignes.length - 3} autre(s) article(s)...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions de validation : Émargement tactile / Reprise */}
                    <div className={styles.actionsValidation}>
                      {etape.type === 'REPRISE' ? (
                        <button
                          type="button"
                          onClick={() => setEtapePourReprise(etape)}
                          className={styles.boutonRepriseAnomalies}
                        >
                          <span>📦</span> Constat de Reprise & Casses
                        </button>
                      ) : estTerminee ? (
                        <div className={styles.badgeValide}>
                          <span>✓</span> Livré & Émargé par le client
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEtapePourSignature(etape)}
                          className={styles.boutonSignature}
                        >
                          <span>✍️</span> Faire signer la dépose (Bon de livraison)
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* MODALE 1 : SCANNER CAMERA UNIVERSEL */}
      {scannerOuvert && (
        <div className={styles.modaleFond}>
          <div className={styles.modaleFenetre} style={{ padding: 0 }}>
            <ScannerCamera
              onScan={gererScan}
              onFermer={() => setScannerOuvert(false)}
              titre="Scan Matériel & Tournée"
              description="Scannez le QR devis, le code-barres palette ou l'article"
            />
          </div>
        </div>
      )}

      {/* MODALE 2 : ÉMARGEMENT CLIENT TACTILE SUR SMARTPHONE */}
      {etapePourSignature && (
        <div className={styles.modaleFond}>
          <div className={styles.modaleFenetre}>
            <div className={styles.modaleEntete}>
              <div className={styles.modaleTitre}>✍️ Émargement Client</div>
              <button
                type="button"
                onClick={() => setEtapePourSignature(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
              Bon de livraison pour <strong>{etapePourSignature.devis?.client?.nom || 'le client'}</strong>
              {etapePourSignature.devis?.numero && ` (${etapePourSignature.devis.numero})`}.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                Nom & Prénom du signataire
              </label>
              <input
                type="text"
                value={nomSignataire}
                onChange={(e) => setNomSignataire(e.target.value)}
                placeholder="Ex: Jean Dupont"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Signature tactile (au doigt ou stylet) :</span>
                <button
                  type="button"
                  onClick={effacerSignature}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Effacer
                </button>
              </div>

              <canvas
                ref={canvasRef}
                className={styles.canvasSignature}
                onPointerDown={demarrerDessin}
                onPointerMove={dessiner}
                onPointerUp={arreterDessin}
                onPointerLeave={arreterDessin}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px' }}>
              📍 Coordonnées GPS horodatées enregistrées automatiquement ({coordsGpsActuel || 'en attente'}).
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEtapePourSignature(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={validerEmargement}
                disabled={chargementValidation || !signatureEnregistree}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: signatureEnregistree ? 'pointer' : 'not-allowed',
                  opacity: signatureEnregistree ? 1 : 0.5,
                }}
              >
                {chargementValidation ? 'Validation...' : 'Valider la Dépose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 3 : CONSTAT DE REPRISE & ANOMALIES / PHOTOS */}
      {etapePourReprise && (
        <div className={styles.modaleFond}>
          <div className={styles.modaleFenetre}>
            <div className={styles.modaleEntete}>
              <div className={styles.modaleTitre}>📦 Constat de Reprise Matériel</div>
              <button
                type="button"
                onClick={() => setEtapePourReprise(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
              Reprise du matériel pour <strong>{etapePourReprise.devis?.client?.nom}</strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                ⚠️ Signaler une casse ou un manquant (Optionnel) :
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Désignation article (ex: Assiette)"
                  value={articleCasseNom}
                  onChange={(e) => setArticleCasseNom(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={quantiteCasse}
                  onChange={(e) => setQuantiteCasse(parseInt(e.target.value) || 1)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <textarea
                placeholder="Description du constat ou motif..."
                value={commentaireReprise}
                onChange={(e) => setCommentaireReprise(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  marginBottom: '10px',
                }}
              />

              {/* Bouton photo smartphone natif */}
              <div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>📷</span> Prendre une photo justificative
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={ajouterPhotoAnomalie}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {photosAnomalies.length > 0 && (
                <div className={styles.photoPreviewGrille}>
                  {photosAnomalies.map((photo, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={photo} alt={`Anomalie ${idx + 1}`} className={styles.vignettePhoto} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEtapePourReprise(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={validerReprise}
                disabled={chargementValidation}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {chargementValidation ? 'Enregistrement...' : 'Valider la Reprise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
