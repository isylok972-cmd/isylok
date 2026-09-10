'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import styles from '../commercial.module.css'
import { formaterPrix } from '@/lib/utilitaires'
import { Client, ArticleStock, LigneDevisModel } from './ModaleDevis'

interface PropsBrouillonsIA {
  onDevisCree: () => void
}

// Helper: normalize string for fuzzy matching (lowercase, no accents)
function normaliser(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Levenshtein distance for fuzzy matching
function distanceLevenshtein(a: string, b: string): number {
  const an = a ? a.length : 0
  const bn = b ? b.length : 0
  if (an === 0) return bn
  if (bn === 0) return an

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0))
  for (let i = 0; i <= an; ++i) matrix[0][i] = i
  for (let i = 0; i <= bn; ++i) matrix[i][0] = i

  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // suppression
        )
      }
    }
  }
  return matrix[bn][an]
}

// Similarity score between 0 and 1
function similariteFuzzy(s1: string, s2: string): number {
  const norm1 = normaliser(s1)
  const norm2 = normaliser(s2)

  if (norm1 === norm2) return 1
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85

  const dist = distanceLevenshtein(norm1, norm2)
  const maxLen = Math.max(norm1.length, norm2.length)
  if (maxLen === 0) return 1
  return 1 - dist / maxLen
}

export function BrouillonsIA({ onDevisCree }: PropsBrouillonsIA) {
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<ArticleStock[]>([])

  // Brief text input
  const [texteBrief, setTexteBrief] = useState('')

  // Speech Recognition state
  const [ecouteActive, setEcouteActive] = useState(false)
  const [supportMicro, setSupportMicro] = useState(true)
  const recognitionRef = useRef<any>(null)

  // Rapid Intent Selectors
  const [format, setFormat] = useState<'ASSIS' | 'DEBOUT'>('ASSIS')
  const [nbInvites, setNbInvites] = useState<number>(80)
  const [optionDanseBuffet, setOptionDanseBuffet] = useState<boolean>(true)

  // Generated Quote State
  const [clientId, setClientId] = useState('')
  const [clientRecherche, setClientRecherche] = useState('')
  const [clientMenuOuvert, setClientMenuOuvert] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const [dateEvenement, setDateEvenement] = useState('')
  const [lieuEvenement, setLieuEvenement] = useState('')
  const [lignesGenerees, setLignesGenerees] = useState<LigneDevisModel[]>([])

  // Global discount
  const [remiseGlobaleType, setRemiseGlobaleType] = useState<'POURCENTAGE' | 'MONTANT'>('MONTANT')
  const [remiseGlobaleValeur, setRemiseGlobaleValeur] = useState(0)

  // TVA selection state (Default: 8.5% Martinique / DOM)
  const [modeTauxTva, setModeTauxTva] = useState<string>('8.5')
  const [tauxTvaPerso, setTauxTvaPerso] = useState<number>(8.5)

  // Calculation details explanation
  const [infoCalculs, setInfoCalculs] = useState<{
    surfaceRequise: number
    surfaceCouverte: number
    ratioApplique: number
    chapiteauxSugg: string[]
  } | null>(null)

  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false)
  const [messageSucces, setMessageSucces] = useState('')
  const [devisCreeId, setDevisCreeId] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')

  // Load clients and stock articles
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        if (data.succes) setClients(data.donnees)
      })
      .catch(console.error)

    fetch('/api/stocks')
      .then(r => r.json())
      .then(data => {
        if (data.succes) setArticles(data.donnees)
      })
      .catch(console.error)
  }, [])

  // Web Speech API Initialization (French fr-FR)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupportMicro(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'fr-FR'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      if (finalTranscript) {
        setTexteBrief(prev => {
          const updated = (prev ? prev.trim() + ' ' : '') + finalTranscript.trim()
          detecterIntentionsAutomatiques(updated)
          return updated
        })
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error)
      setEcouteActive(false)
    }

    recognition.onend = () => {
      setEcouteActive(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Toggle Microphone
  const basculerMicro = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas disponible dans ce navigateur. Utilisez Chrome ou Edge.')
      return
    }

    if (ecouteActive) {
      recognitionRef.current.stop()
      setEcouteActive(false)
    } else {
      try {
        recognitionRef.current.start()
        setEcouteActive(true)
      } catch (err) {
        console.error('Erreur démarrage micro:', err)
        setEcouteActive(false)
      }
    }
  }

  // Close client dropdown on outside click
  useEffect(() => {
    const handleClickEnDehors = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientMenuOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickEnDehors)
    return () => document.removeEventListener('mousedown', handleClickEnDehors)
  }, [])

  // Automatic intent detection from brief text
  const detecterIntentionsAutomatiques = (texte: string) => {
    const norm = normaliser(texte)

    // 1. Detect number of guests
    const matchInvites =
      texte.match(/(\d{1,4})\s*(?:personnes?|invit[eé]s?|convives?|pax|pers)/i) ||
      texte.match(/(?:pour|de|avec)\s+(\d{1,4})/i)
    if (matchInvites && matchInvites[1]) {
      const val = parseInt(matchInvites[1], 10)
      if (val > 0) setNbInvites(val)
    }

    // 2. Detect format
    if (/(?:assis|repas|diner|dîner|dejeuner|déjeuner|banquet)/i.test(norm)) {
      setFormat('ASSIS')
    } else if (/(?:debout|cocktail|vin d['\s]?honneur|apero|apéritif|buffet dinatoire)/i.test(norm)) {
      setFormat('DEBOUT')
    }

    // 3. Detect buffet or dance floor
    if (/(?:danse|piste de danse|buffet|dj|musique)/i.test(norm)) {
      setOptionDanseBuffet(true)
    }
  }

  // Extract chapiteau surface helper
  const extraireSurfaceChapiteau = (art: ArticleStock): number => {
    const texte = `${art.nom} ${art.reference}`
    // Regex like 150m² or 48m2
    const matchM2 = texte.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2)/i)
    if (matchM2) return parseFloat(matchM2[1].replace(',', '.'))

    // Regex like 10x15m or 6x8m
    const matchDim = texte.match(/(\d+)\s*[xX*]\s*(\d+)/)
    if (matchDim) return parseInt(matchDim[1], 10) * parseInt(matchDim[2], 10)

    // Defaults based on standard demo articles if not in name
    if (art.reference === 'CHP-001') return 150
    if (art.reference === 'CHP-002') return 48

    return 50 // fallback estimation
  }

  // Find optimal chapiteaux combination
  const trouverMeilleursChapiteaux = (surfaceRequise: number, chapiteauxDispo: ArticleStock[]) => {
    if (chapiteauxDispo.length === 0) return { selection: [] as { article: ArticleStock; surface: number; quantite: number }[], surfaceTotale: 0 }

    // Sort chapiteaux by surface descending
    const chapiteauxAvecSurface = chapiteauxDispo
      .map(c => ({
        article: c,
        surface: extraireSurfaceChapiteau(c)
      }))
      .sort((a, b) => b.surface - a.surface)

    // Greedy strategy with optimization
    const selection: { article: ArticleStock; surface: number; quantite: number }[] = []
    let surfaceActuelle = 0

    // Try large tents first
    for (const c of chapiteauxAvecSurface) {
      if (surfaceActuelle >= surfaceRequise) break

      const surfaceRestante = surfaceRequise - surfaceActuelle
      if (surfaceRestante >= c.surface * 0.7) {
        const nbBesoin = Math.floor(surfaceRestante / c.surface)
        const qte = Math.min(nbBesoin, c.article.quantiteDisponible ?? 99)
        if (qte > 0) {
          selection.push({ article: c.article, surface: c.surface, quantite: qte })
          surfaceActuelle += qte * c.surface
        }
      }
    }

    // If still deficit, take the smallest tent that covers remainder
    if (surfaceActuelle < surfaceRequise) {
      const tentPlusPetite = [...chapiteauxAvecSurface].reverse().find(c => c.surface >= (surfaceRequise - surfaceActuelle))
        || chapiteauxAvecSurface[chapiteauxAvecSurface.length - 1]

      if (tentPlusPetite) {
        const existant = selection.find(s => s.article.id === tentPlusPetite.article.id)
        if (existant) {
          existant.quantite += 1
          surfaceActuelle += tentPlusPetite.surface
        } else {
          selection.push({ article: tentPlusPetite.article, surface: tentPlusPetite.surface, quantite: 1 })
          surfaceActuelle += tentPlusPetite.surface
        }
      }
    }

    return { selection, surfaceTotale: surfaceActuelle }
  }

  // Match articles from dictated text using fuzzy matching
  const extraireArticlesDuTexte = (texte: string, articlesCatalogue: ArticleStock[]) => {
    if (!texte.trim()) return []

    const articlesTrouves: { article: ArticleStock; quantite: number }[] = []
    const phrases = texte.split(/[,.;\n]+/)

    for (const phrase of phrases) {
      const pNorm = normaliser(phrase)
      if (!pNorm) continue

      // Look for quantity in phrase
      const matchQte = phrase.match(/(\d+)\s*(?:x|fois)?/i)
      const qte = matchQte ? parseInt(matchQte[1], 10) : 1

      // Search best match in catalogue
      let meilleurArticle: ArticleStock | null = null
      let meilleurScore = 0

      for (const art of articlesCatalogue) {
        // Skip tent/table/chair if already handled by main algorithm unless explicitly named
        const scoreNom = similariteFuzzy(pNorm, art.nom)
        const scoreRef = similariteFuzzy(pNorm, art.reference)
        const score = Math.max(scoreNom, scoreRef)

        if (score > meilleurScore && score >= 0.55) {
          meilleurScore = score
          meilleurArticle = art
        }
      }

      if (meilleurArticle && !articlesTrouves.some(a => a.article.id === meilleurArticle!.id)) {
        articlesTrouves.push({ article: meilleurArticle, quantite: qte })
      }
    }

    return articlesTrouves
  }

  // MAIN LOCAL GENERATOR FUNCTION
  const genererBrouillonDevis = () => {
    if (articles.length === 0) return

    setErreur('')
    setMessageSucces('')

    // 1. Calculate Required Tent Surface
    // Assis = 1.2 m² / pers, Debout = 0.6 m² / pers, +20% if buffet/danse
    const ratioBase = format === 'ASSIS' ? 1.2 : 0.6
    const multiplicateurMarge = optionDanseBuffet ? 1.2 : 1.0
    const surfaceRequise = Math.ceil(nbInvites * ratioBase * multiplicateurMarge * 10) / 10

    // Filter chapiteaux from stock
    const chapiteauxDispo = articles.filter(a =>
      a.categorie?.nom.toLowerCase().includes('chapiteau') ||
      a.nom.toLowerCase().includes('chapiteau') ||
      a.reference.startsWith('CHP')
    )

    const { selection: chapiteauxSugg, surfaceTotale } = trouverMeilleursChapiteaux(
      surfaceRequise,
      chapiteauxDispo
    )

    setInfoCalculs({
      surfaceRequise,
      surfaceCouverte: surfaceTotale,
      ratioApplique: ratioBase,
      chapiteauxSugg: chapiteauxSugg.map(c => `${c.quantite}x ${c.article.nom} (${c.surface * c.quantite}m²)`)
    })

    const nouvellesLignes: LigneDevisModel[] = []

    // Add suggested tents
    for (const item of chapiteauxSugg) {
      const brut = item.quantite * item.article.prixLocationJour
      nouvellesLignes.push({
        id: Math.random().toString(),
        articleId: item.article.id,
        designation: `${item.article.nom} (${item.surface}m²)`,
        quantite: item.quantite,
        prixUnitaire: item.article.prixLocationJour,
        remiseLigneType: 'MONTANT',
        remiseLigneValeur: 0,
        remiseLigne: 0,
        totalLigne: brut
      })
    }

    // 2. Calculate Furniture & Tableware
    if (nbInvites > 0) {
      // TABLES
      const tableArticle =
        articles.find(a => normaliser(a.nom).includes('table') && normaliser(a.nom).includes('ronde')) ||
        articles.find(a => normaliser(a.nom).includes('table'))

      // Chairs
      const chaiseArticle =
        articles.find(a => normaliser(a.nom).includes('chaise')) ||
        articles.find(a => a.categorie?.nom.toLowerCase().includes('mobilier') && normaliser(a.nom).includes('napol'))

      // Plates
      const assietteArticle =
        articles.find(a => normaliser(a.nom).includes('assiette')) ||
        articles.find(a => a.categorie?.nom.toLowerCase().includes('vaisselle'))

      // Glasses
      const verreArticle =
        articles.find(a => normaliser(a.nom).includes('verre')) ||
        articles.find(a => a.categorie?.nom.toLowerCase().includes('vaisselle') && normaliser(a.nom).includes('vin'))

      // Tablecloths
      const nappeArticle = articles.find(a => normaliser(a.nom).includes('nappe'))

      // Capacite table (ex: 10 places)
      let capaciteTable = 10
      if (tableArticle) {
        const matchCap = tableArticle.nom.match(/(\d+)\s*places?/i)
        if (matchCap) capaciteTable = parseInt(matchCap[1], 10)
      }

      let nbTables = 0
      if (tableArticle) {
        nbTables = format === 'ASSIS' ? Math.ceil(nbInvites / capaciteTable) : Math.ceil(nbInvites / 15) // buffet/mange-debout
        const brut = nbTables * tableArticle.prixLocationJour
        nouvellesLignes.push({
          id: Math.random().toString(),
          articleId: tableArticle.id,
          designation: `${tableArticle.nom} (${capaciteTable} pers/table)`,
          quantite: nbTables,
          prixUnitaire: tableArticle.prixLocationJour,
          remiseLigneType: 'MONTANT',
          remiseLigneValeur: 0,
          remiseLigne: 0,
          totalLigne: brut
        })
      }

      // Nappes
      if (nappeArticle && nbTables > 0) {
        const qteNappes = nbTables + 2 // +2 de réserve/buffet
        const brut = qteNappes * nappeArticle.prixLocationJour
        nouvellesLignes.push({
          id: Math.random().toString(),
          articleId: nappeArticle.id,
          designation: nappeArticle.nom,
          quantite: qteNappes,
          prixUnitaire: nappeArticle.prixLocationJour,
          remiseLigneType: 'MONTANT',
          remiseLigneValeur: 0,
          remiseLigne: 0,
          totalLigne: brut
        })
      }

      // Chaises
      if (chaiseArticle) {
        const qteChaises = format === 'ASSIS' ? nbInvites : Math.ceil(nbInvites * 0.3) // appoint cocktail
        const brut = qteChaises * chaiseArticle.prixLocationJour
        nouvellesLignes.push({
          id: Math.random().toString(),
          articleId: chaiseArticle.id,
          designation: chaiseArticle.nom,
          quantite: qteChaises,
          prixUnitaire: chaiseArticle.prixLocationJour,
          remiseLigneType: 'MONTANT',
          remiseLigneValeur: 0,
          remiseLigne: 0,
          totalLigne: brut
        })
      }

      // Assiettes
      if (assietteArticle) {
        const qteAssiettes = Math.ceil(nbInvites * 1.1) // 10% safety margin
        const brut = qteAssiettes * assietteArticle.prixLocationJour
        nouvellesLignes.push({
          id: Math.random().toString(),
          articleId: assietteArticle.id,
          designation: `${assietteArticle.nom} (+10% marge casse/service)`,
          quantite: qteAssiettes,
          prixUnitaire: assietteArticle.prixLocationJour,
          remiseLigneType: 'MONTANT',
          remiseLigneValeur: 0,
          remiseLigne: 0,
          totalLigne: brut
        })
      }

      // Verres
      if (verreArticle) {
        const qteVerres = Math.ceil(nbInvites * 1.5) // 1.5 verre par personne
        const brut = qteVerres * verreArticle.prixLocationJour
        nouvellesLignes.push({
          id: Math.random().toString(),
          articleId: verreArticle.id,
          designation: `${verreArticle.nom} (ratio 1.5/pers)`,
          quantite: qteVerres,
          prixUnitaire: verreArticle.prixLocationJour,
          remiseLigneType: 'MONTANT',
          remiseLigneValeur: 0,
          remiseLigne: 0,
          totalLigne: brut
        })
      }
    }

    // 3. Extract other articles from free text (Fuzzy matching)
    if (texteBrief.trim()) {
      const extraits = extraireArticlesDuTexte(texteBrief, articles)
      for (const item of extraits) {
        // Skip if already in lines
        if (!nouvellesLignes.some(l => l.articleId === item.article.id)) {
          const brut = item.quantite * item.article.prixLocationJour
          nouvellesLignes.push({
            id: Math.random().toString(),
            articleId: item.article.id,
            designation: `${item.article.nom} (extrait du brief)`,
            quantite: item.quantite,
            prixUnitaire: item.article.prixLocationJour,
            remiseLigneType: 'MONTANT',
            remiseLigneValeur: 0,
            remiseLigne: 0,
            totalLigne: brut
          })
        }
      }
    }

    setLignesGenerees(nouvellesLignes)
  }

  // Row updates in generated table
  const majLigne = (id: string, modifications: Partial<LigneDevisModel>) => {
    setLignesGenerees(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, ...modifications }

        const brut = (updated.quantite || 0) * (updated.prixUnitaire || 0)
        let montantRemise = 0

        if (updated.remiseLigneType === 'POURCENTAGE') {
          montantRemise = brut * ((updated.remiseLigneValeur || 0) / 100)
        } else {
          montantRemise = updated.remiseLigneValeur || 0
        }

        montantRemise = Math.max(0, Math.min(brut, montantRemise))
        updated.remiseLigne = Math.round(montantRemise * 100) / 100
        updated.totalLigne = Math.max(0, Math.round((brut - montantRemise) * 100) / 100)

        return updated
      })
    )
  }

  const supprimerLigne = (id: string) => {
    setLignesGenerees(lignesGenerees.filter(l => l.id !== id))
  }

  const ajouterLigneManuelle = () => {
    setLignesGenerees([
      ...lignesGenerees,
      {
        id: Math.random().toString(),
        articleId: '',
        designation: 'Article personnalisé',
        quantite: 1,
        prixUnitaire: 0,
        remiseLigneType: 'MONTANT',
        remiseLigneValeur: 0,
        remiseLigne: 0,
        totalLigne: 0
      }
    ])
  }

  // Calculation Totals
  const sousTotal = Math.round(lignesGenerees.reduce((sum, l) => sum + l.totalLigne, 0) * 100) / 100
  const montantRemiseGlobale = Math.round(
    (remiseGlobaleType === 'POURCENTAGE'
      ? sousTotal * ((remiseGlobaleValeur || 0) / 100)
      : Math.min(sousTotal, remiseGlobaleValeur || 0)) * 100
  ) / 100

  const totalApresRemise = Math.max(0, Math.round((sousTotal - montantRemiseGlobale) * 100) / 100)
  const tauxTvaEffectif = modeTauxTva === 'PERSO' ? (tauxTvaPerso || 0) : parseFloat(modeTauxTva)
  const montantTva = Math.round(totalApresRemise * (tauxTvaEffectif / 100) * 100) / 100
  const totalTtc = Math.round((totalApresRemise + montantTva) * 100) / 100

  // Filtered clients for autocomplete
  const clientsFiltres = useMemo(() => {
    if (!clientRecherche.trim()) return clients
    const q = normaliser(clientRecherche)
    return clients.filter(c => {
      const nomComplet = normaliser(`${c.prenom || ''} ${c.nom}`)
      const entreprise = normaliser(c.entreprise || '')
      const ville = normaliser(c.ville || '')
      return nomComplet.includes(q) || entreprise.includes(q) || ville.includes(q)
    })
  }, [clients, clientRecherche])

  const clientSelectionne = clients.find(c => c.id === clientId)

  // Save Quote to Database
  const confirmerEtEnregistrerDevis = async () => {
    if (!clientId) {
      setErreur('Veuillez sélectionner un client pour ce devis')
      return
    }
    if (lignesGenerees.length === 0) {
      setErreur('Le devis ne contient aucune ligne à enregistrer')
      return
    }

    setSauvegardeEnCours(true)
    setErreur('')

    try {
      const rep = await fetch('/api/commercial/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateEvenement: dateEvenement || null,
          lieuEvenement,
          sousTotal,
          remise: montantRemiseGlobale,
          tauxTva: tauxTvaEffectif,
          montantTva,
          totalTtc,
          lignes: lignesGenerees.map(l => ({
            articleId: l.articleId || null,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remiseLigne: l.remiseLigne,
            totalLigne: l.totalLigne
          }))
        })
      })

      const data = await rep.json()
      if (data.succes) {
        setDevisCreeId(data.donnees.id)
        setMessageSucces(`Devis ${data.donnees.numero} créé avec succès !`)
        onDevisCree()
      } else {
        setErreur(data.message || 'Erreur lors de la création du devis')
      }
    } catch {
      setErreur('Erreur réseau lors de l\'enregistrement')
    } finally {
      setSauvegardeEnCours(false)
    }
  }

  return (
    <div className={styles.iaConteneur}>
      {/* PANNEAU DE SAISIE VOCALE ET DÉTECTION RAPIDE */}
      <section className={styles.iaPanneauSaisie}>
        <div className={styles.iaEntete}>
          <div className={styles.iaTitreSection}>
            <h2>✨ Générateur de Brouillons I.A. Métier</h2>
            <p>
              Dictez ou collez votre brief client. Le moteur local applique les ratios surfaces chapiteaux, mobilier et vaisselle instantanément.
            </p>
          </div>
          <div className={styles.iaBadgeMode}>
            <span>🔒 100% Local (Sans API externe)</span>
          </div>
        </div>

        {/* ZONE DE TEXTE & BOUTON MICRO */}
        <div className={styles.iaZoneTexteConteneur}>
          <textarea
            className={styles.iaTextarea}
            value={texteBrief}
            onChange={e => {
              setTexteBrief(e.target.value)
              detecterIntentionsAutomatiques(e.target.value)
            }}
            placeholder="Exemple : Mariage de 120 personnes en repas assis avec piste de danse et buffet au Domaine de la Pagerie, besoin de verres à vin, assiettes plates et tables rondes..."
          />

          <button
            type="button"
            className={`${styles.boutonMicro} ${ecouteActive ? styles.boutonMicroActif : ''}`}
            onClick={basculerMicro}
            title={
              supportMicro
                ? ecouteActive
                  ? 'Arrêter l\'écoute vocale'
                  : 'Dicter le brief au micro (Web Speech API)'
                : 'Micro non supporté sur ce navigateur'
            }
          >
            {ecouteActive ? '🛑' : '🎙️'}
          </button>

          {ecouteActive && (
            <div className={styles.indicateurMicroActif}>
              <span className={styles.pointRougeClignotant}></span>
              <span>Écoute vocale en cours (fr-FR)... Parlez naturellement.</span>
            </div>
          )}
        </div>

        {/* SÉLECTEURS D'INTENTION RAPIDES */}
        <div className={styles.iaSelecteursRapides}>
          {/* Format de réception */}
          <div className={styles.iaSelecteurItem}>
            <span className={styles.iaSelecteurLabel}>Format de l'événement</span>
            <div className={styles.iaBoutonsSegmentes}>
              <button
                type="button"
                className={`${styles.iaBoutonSegment} ${format === 'ASSIS' ? styles.iaBoutonSegmentActif : ''}`}
                onClick={() => setFormat('ASSIS')}
              >
                🍽️ Assis / Repas (1,2 m²/p)
              </button>
              <button
                type="button"
                className={`${styles.iaBoutonSegment} ${format === 'DEBOUT' ? styles.iaBoutonSegmentActif : ''}`}
                onClick={() => setFormat('DEBOUT')}
              >
                🥂 Debout / Cocktail (0,6 m²/p)
              </button>
            </div>
          </div>

          {/* Nombre d'invités */}
          <div className={styles.iaSelecteurItem}>
            <span className={styles.iaSelecteurLabel}>Nombre d'invités</span>
            <input
              type="number"
              min="1"
              max="5000"
              value={nbInvites}
              onChange={e => setNbInvites(parseInt(e.target.value, 10) || 0)}
              className={styles.iaInputNombre}
            />
          </div>

          {/* Option Piste de danse / Buffet */}
          <div className={styles.iaSelecteurItem}>
            <span className={styles.iaSelecteurLabel}>Espaces supplémentaires</span>
            <button
              type="button"
              className={`${styles.iaBoutonOptionToggle} ${optionDanseBuffet ? styles.iaBoutonOptionToggleActif : ''}`}
              onClick={() => setOptionDanseBuffet(!optionDanseBuffet)}
            >
              <span>💃 Piste de danse / Buffet</span>
              <span>{optionDanseBuffet ? '✅ (+20% surface)' : '⬜ Non'}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className={styles.iaBoutonGenerer}
          onClick={genererBrouillonDevis}
        >
          <span>⚡ Calculer &amp; Générer le devis</span>
        </button>
      </section>

      {/* EXPLICATION DES RATIOS ET CALCULS */}
      {infoCalculs && (
        <section className={styles.iaExplicationsGrid}>
          <div className={styles.iaCarteExplication}>
            <div className={styles.iaCarteExplicationTitre}>
              <span>⛺</span> Surface de chapiteaux requise
            </div>
            <div className={styles.iaCarteExplicationValeur}>
              {infoCalculs.surfaceRequise} m²
            </div>
            <div className={styles.iaCarteExplicationDetail}>
              Calcul : {nbInvites} pers. × {infoCalculs.ratioApplique} m²
              {optionDanseBuffet ? ' + marge de 20% (buffet / piste de danse)' : ''}
            </div>
          </div>

          <div className={styles.iaCarteExplication}>
            <div className={styles.iaCarteExplicationTitre}>
              <span>📐</span> Surface couverte par le stock
            </div>
            <div className={styles.iaCarteExplicationValeur} style={{ color: infoCalculs.surfaceCouverte >= infoCalculs.surfaceRequise ? '#34d399' : '#f87171' }}>
              {infoCalculs.surfaceCouverte} m²
            </div>
            <div className={styles.iaCarteExplicationDetail}>
              {infoCalculs.chapiteauxSugg.join(' + ') || 'Aucun chapiteau en stock'}
            </div>
          </div>

          <div className={styles.iaCarteExplication}>
            <div className={styles.iaCarteExplicationTitre}>
              <span>🪑</span> Mobilier &amp; Vaisselle calculés
            </div>
            <div className={styles.iaCarteExplicationValeur} style={{ fontSize: 15 }}>
              {format === 'ASSIS' ? `${nbInvites} chaises, ${Math.ceil(nbInvites / 10)} tables rondes` : `Chaises d'appoint & mange-debout`}
            </div>
            <div className={styles.iaCarteExplicationDetail}>
              {Math.ceil(nbInvites * 1.1)} assiettes (+10%) • {Math.ceil(nbInvites * 1.5)} verres à vin (ratio 1.5)
            </div>
          </div>
        </section>
      )}

      {/* TABLEAU ÉDITABLE DU DEVIS PRÉ-REMPLI */}
      {lignesGenerees.length > 0 && (
        <section className={styles.iaDevisPreRempli}>
          <div className={styles.iaDevisEntete}>
            <h3>📋 Devis Pré-rempli (Éditable avant validation)</h3>
            <div className={styles.iaDevisActions}>
              <button
                type="button"
                className={styles.iaBoutonReinitialiser}
                onClick={() => {
                  setLignesGenerees([])
                  setInfoCalculs(null)
                  setMessageSucces('')
                }}
              >
                🔄 Réinitialiser
              </button>
              <button
                type="button"
                className={styles.iaBoutonEnregistrer}
                onClick={confirmerEtEnregistrerDevis}
                disabled={sauvegardeEnCours || !clientId}
              >
                {sauvegardeEnCours ? '⏳ Enregistrement…' : '💾 Confirmer & Enregistrer le devis'}
              </button>
            </div>
          </div>

          {/* SÉLECTION DU CLIENT */}
          <div className={styles.champGroupe} ref={clientRef}>
            <label>Associer ce devis à un client *</label>

            {clientSelectionne ? (
              <div className={styles.clientSelectionneCarte}>
                <div className={styles.clientSelectionneInfos}>
                  <div className={styles.clientNomTitre}>
                    👤 {clientSelectionne.prenom ? `${clientSelectionne.prenom} ` : ''}{clientSelectionne.nom}
                  </div>
                  <div className={styles.clientSousTitre}>
                    {clientSelectionne.entreprise && `🏢 ${clientSelectionne.entreprise} • `}
                    {clientSelectionne.ville && `📍 ${clientSelectionne.ville} • `}
                    {clientSelectionne.telephone && `📞 ${clientSelectionne.telephone}`}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.boutonEffacer}
                  onClick={() => {
                    setClientId('')
                    setClientRecherche('')
                    setClientMenuOuvert(true)
                  }}
                  title="Changer de client"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className={styles.autocompletionWrapper}>
                <div className={styles.champAutocompletion}>
                  <span className={styles.iconeChamp}>🔍</span>
                  <input
                    type="text"
                    placeholder="Tapez un nom de client, une entreprise ou une ville…"
                    value={clientRecherche}
                    onChange={e => {
                      setClientRecherche(e.target.value)
                      setClientMenuOuvert(true)
                    }}
                    onFocus={() => setClientMenuOuvert(true)}
                  />
                  {clientRecherche && (
                    <button
                      type="button"
                      className={styles.boutonEffacer}
                      onClick={() => setClientRecherche('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {clientMenuOuvert && (
                  <ul className={styles.menuSuggestions}>
                    {clientsFiltres.length === 0 ? (
                      <li style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8' }}>
                        Aucun client trouvé pour cette recherche
                      </li>
                    ) : (
                      clientsFiltres.map(c => (
                        <li
                          key={c.id}
                          className={styles.itemSuggestion}
                          onClick={() => {
                            setClientId(c.id)
                            setClientMenuOuvert(false)
                          }}
                        >
                          <div className={styles.suggestionNom}>
                            <span>
                              {c.prenom ? `${c.prenom} ` : ''}<strong>{c.nom}</strong>
                            </span>
                            {c.entreprise && <span className={styles.badgeMini}>{c.entreprise}</span>}
                          </div>
                          <div className={styles.suggestionDetails}>
                            {c.ville && <span>📍 {c.ville}</span>}
                            {c.telephone && <span>📞 {c.telephone}</span>}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* DATE & LIEU */}
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Date de l'événement</label>
              <input
                type="date"
                value={dateEvenement}
                onChange={e => setDateEvenement(e.target.value)}
              />
            </div>
            <div className={styles.champGroupe}>
              <label>Lieu de l'événement</label>
              <input
                value={lieuEvenement}
                onChange={e => setLieuEvenement(e.target.value)}
                placeholder="Ex: Habitation Clément, Le François..."
              />
            </div>
          </div>

          {/* TABLEAU DES LIGNES ÉDITABLE */}
          <div className={styles.lignesDevis}>
            <div className={styles.ligneDevisEnteteV2}>
              <span>Désignation de l'article</span>
              <span>Qté</span>
              <span>Prix U. HT</span>
              <span>Remise</span>
              <span style={{ textAlign: 'right' }}>Total HT</span>
              <span></span>
            </div>

            {lignesGenerees.map(ligne => (
              <div key={ligne.id} className={styles.ligneDevisItemV2}>
                <input
                  value={ligne.designation}
                  onChange={e => majLigne(ligne.id, { designation: e.target.value })}
                  placeholder="Désignation de l'article..."
                  style={{ padding: '8px 10px', fontSize: 13 }}
                />

                <input
                  type="number"
                  min="1"
                  value={ligne.quantite}
                  onChange={e =>
                    majLigne(ligne.id, { quantite: parseInt(e.target.value, 10) || 1 })
                  }
                  style={{ padding: '8px', textAlign: 'center', fontSize: 13 }}
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ligne.prixUnitaire}
                  onChange={e =>
                    majLigne(ligne.id, { prixUnitaire: parseFloat(e.target.value) || 0 })
                  }
                  style={{ padding: '8px', textAlign: 'right', fontSize: 13 }}
                />

                <div className={styles.groupeRemise}>
                  <div className={styles.basculeRemise}>
                    <button
                      type="button"
                      className={`${styles.boutonBascule} ${
                        ligne.remiseLigneType === 'POURCENTAGE' ? styles.boutonBasculeActif : ''
                      }`}
                      onClick={() => majLigne(ligne.id, { remiseLigneType: 'POURCENTAGE' })}
                      title="Pourcentage"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={`${styles.boutonBascule} ${
                        ligne.remiseLigneType === 'MONTANT' ? styles.boutonBasculeActif : ''
                      }`}
                      onClick={() => majLigne(ligne.id, { remiseLigneType: 'MONTANT' })}
                      title="Montant en euros"
                    >
                      €
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={ligne.remiseLigneType === 'POURCENTAGE' ? 100 : undefined}
                    value={ligne.remiseLigneValeur}
                    onChange={e =>
                      majLigne(ligne.id, {
                        remiseLigneValeur: parseFloat(e.target.value) || 0
                      })
                    }
                    style={{
                      width: '100%',
                      minWidth: 50,
                      padding: '8px 6px',
                      textAlign: 'right',
                      fontSize: 13
                    }}
                  />
                </div>

                <div className={styles.colonneTotalLigne}>
                  {formaterPrix(ligne.totalLigne)}
                </div>

                <button
                  type="button"
                  className={styles.boutonAction}
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                  onClick={() => supprimerLigne(ligne.id)}
                  title="Supprimer la ligne"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.boutonAjoutLigne}
            onClick={ajouterLigneManuelle}
          >
            + Ajouter une ligne personnalisée
          </button>

          {/* SÉLECTION DU TAUX DE TVA */}
          <div className={styles.sectionTva}>
            <div className={styles.sectionTvaEntete}>
              <span className={styles.sectionTvaTitre}>
                📊 Taux de TVA applicable :
              </span>
              {modeTauxTva === 'PERSO' && (
                <div className={styles.champTvaPersoConteneur}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tauxTvaPerso}
                    onChange={e => setTauxTvaPerso(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.champTvaPersoInput}
                    placeholder="Ex: 5.5"
                  />
                  <span style={{ fontSize: 13, color: '#fcd34d', fontWeight: 600 }}>%</span>
                </div>
              )}
            </div>

            <div className={styles.pastillesTva}>
              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '8.5' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('8.5')}
              >
                <span>8,5 %</span>
                <span className={styles.pastilleTvaBadge}>Martinique / DOM (Défaut)</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '0' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('0')}
              >
                <span>0 %</span>
                <span className={styles.pastilleTvaBadge}>Exonéré / Franchise</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '2.1' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('2.1')}
              >
                <span>2,1 %</span>
                <span className={styles.pastilleTvaBadge}>Taux réduit DOM</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '20' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('20')}
              >
                <span>20 %</span>
                <span className={styles.pastilleTvaBadge}>Métropole</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === 'PERSO' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('PERSO')}
              >
                <span>Personnalisé</span>
              </button>
            </div>

            {tauxTvaEffectif === 0 && (
              <div className={styles.mentionExonerationTva}>
                <span>⚖️</span>
                <span>
                  <strong>Mention légale :</strong> TVA non applicable, art. 293 B du CGI
                </span>
              </div>
            )}
          </div>

          {/* TOTAUX & REMISE GLOBALE */}
          <div className={styles.totauxPanel}>
            <div className={styles.totauxLigne}>
              <span>Sous-total HT :</span>
              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{formaterPrix(sousTotal)}</span>
            </div>

            <div className={styles.totauxLigne} style={{ alignItems: 'center' }}>
              <span>Remise globale :</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={styles.basculeRemise}>
                  <button
                    type="button"
                    className={`${styles.boutonBascule} ${
                      remiseGlobaleType === 'POURCENTAGE' ? styles.boutonBasculeActif : ''
                    }`}
                    onClick={() => setRemiseGlobaleType('POURCENTAGE')}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={`${styles.boutonBascule} ${
                      remiseGlobaleType === 'MONTANT' ? styles.boutonBasculeActif : ''
                    }`}
                    onClick={() => setRemiseGlobaleType('MONTANT')}
                  >
                    €
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remiseGlobaleType === 'POURCENTAGE' ? 100 : undefined}
                  value={remiseGlobaleValeur}
                  onChange={e => setRemiseGlobaleValeur(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 75,
                    padding: '6px 8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 8,
                    color: '#fff',
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  (-{formaterPrix(montantRemiseGlobale)})
                </span>
              </div>
            </div>

            <div className={styles.totauxLigne}>
              <span>TVA ({tauxTvaEffectif.toString().replace('.', ',')}%) :</span>
              <span style={{ color: '#f1f5f9' }}>{formaterPrix(montantTva)}</span>
            </div>

            <div className={styles.totauxLigneTtc}>
              <span>Total TTC :</span>
              <span>{formaterPrix(totalTtc)}</span>
            </div>
          </div>

          {erreur && <div className={styles.erreurMessage}>⚠️ {erreur}</div>}
          {messageSucces && (
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ color: '#34d399', fontSize: 14, fontWeight: 600 }}>
                🎉 {messageSucces}
              </div>
              {devisCreeId && (
                <a
                  href={`/api/commercial/devis/${devisCreeId}/pdf?download=1`}
                  download
                  className={styles.boutonTelechargerPdfDirect}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  📄 Télécharger le PDF officiel
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            className={styles.boutonSoumettre}
            onClick={confirmerEtEnregistrerDevis}
            disabled={sauvegardeEnCours || !clientId}
            style={{ width: '100%', marginTop: 8 }}
          >
            {sauvegardeEnCours ? '⏳ Enregistrement du devis…' : '✅ Valider & Confirmer l\'enregistrement du devis'}
          </button>
        </section>
      )}
    </div>
  )
}
