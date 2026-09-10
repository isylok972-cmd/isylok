// ===========================================
// Event-Gérance Pro — File de Synchronisation
// ===========================================

import {
  recupererActionsEnAttente,
  supprimerAction,
  incrementerTentatives,
} from './indexeddb'
import type { ActionHorsLigne } from '@/types'

const MAX_TENTATIVES = 5
const DELAI_ENTRE_TENTATIVES = 2000 // ms

/**
 * Tente de synchroniser toutes les actions en attente
 * Retourne le nombre d'actions synchronisées avec succès
 */
export async function synchroniserTout(): Promise<number> {
  const actions = await recupererActionsEnAttente()

  if (actions.length === 0) return 0

  let synchronisees = 0

  // Trier par horodatage (plus ancien en premier)
  const actionTriees = actions.sort(
    (a, b) => new Date(a.horodatage).getTime() - new Date(b.horodatage).getTime()
  )

  for (const action of actionTriees) {
    if (action.tentatives >= MAX_TENTATIVES) {
      console.warn(`[Synchro] Action ${action.id} abandonnée après ${MAX_TENTATIVES} tentatives`)
      continue
    }

    try {
      await envoyerAction(action)
      await supprimerAction(action.id)
      synchronisees++
    } catch (erreur) {
      console.error(`[Synchro] Erreur pour l'action ${action.id}:`, erreur)
      await incrementerTentatives(action.id)

      // Attendre avant la prochaine tentative
      await new Promise((r) => setTimeout(r, DELAI_ENTRE_TENTATIVES))
    }
  }

  return synchronisees
}

/**
 * Envoie une action au serveur
 */
async function envoyerAction(action: ActionHorsLigne): Promise<void> {
  const reponse = await fetch('/api/synchronisation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entite: action.entite,
      entiteId: action.entiteId,
      action: action.action,
      donnees: action.donnees,
      horodatage: action.horodatage,
    }),
  })

  if (!reponse.ok) {
    const erreur = await reponse.text()
    throw new Error(`Erreur de synchronisation: ${reponse.status} — ${erreur}`)
  }
}

/**
 * Démarre la surveillance réseau pour synchronisation automatique
 */
export function demarrerSurveillanceReseau(): () => void {
  const gestionnaireEnLigne = async () => {
    console.log('[Synchro] Connexion retrouvée — synchronisation en cours…')
    try {
      const nb = await synchroniserTout()
      if (nb > 0) {
        console.log(`[Synchro] ${nb} action(s) synchronisée(s) avec succès`)
      }
    } catch (erreur) {
      console.error('[Synchro] Erreur lors de la synchronisation automatique:', erreur)
    }
  }

  window.addEventListener('online', gestionnaireEnLigne)

  // Retourne une fonction de nettoyage
  return () => {
    window.removeEventListener('online', gestionnaireEnLigne)
  }
}
