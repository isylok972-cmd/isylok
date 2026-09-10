// ===========================================
// Event-Gérance Pro — Hook Hors-Ligne
// ===========================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { observerConnexion } from '@/lib/hors-ligne/detecteur'
import { compterActionsEnAttente } from '@/lib/hors-ligne/indexeddb'
import { synchroniserTout, demarrerSurveillanceReseau } from '@/lib/hors-ligne/file-attente'
import type { EtatSynchronisation } from '@/types'

/**
 * Hook pour gérer l'état hors-ligne de l'application
 * Détecte la connexion, compte les actions en attente et synchronise automatiquement
 */
export function useHorsLigne() {
  const [etat, setEtat] = useState<EtatSynchronisation>({
    enLigne: true,
    enCoursDeSynchro: false,
    derniereSynchro: null,
    actionsEnAttente: 0,
  })

  // Mettre à jour le compteur d'actions en attente
  const rafraichirCompteur = useCallback(async () => {
    try {
      const nombre = await compterActionsEnAttente()
      setEtat((prev) => ({ ...prev, actionsEnAttente: nombre }))
    } catch (erreur) {
      console.error('[HorsLigne] Erreur compteur:', erreur)
    }
  }, [])

  // Synchroniser manuellement
  const synchroniserMaintenant = useCallback(async () => {
    setEtat((prev) => ({ ...prev, enCoursDeSynchro: true }))
    try {
      const nb = await synchroniserTout()
      setEtat((prev) => ({
        ...prev,
        enCoursDeSynchro: false,
        derniereSynchro: nb > 0 ? new Date() : prev.derniereSynchro,
      }))
      await rafraichirCompteur()
      return nb
    } catch (erreur) {
      setEtat((prev) => ({ ...prev, enCoursDeSynchro: false }))
      console.error('[HorsLigne] Erreur synchro manuelle:', erreur)
      return 0
    }
  }, [rafraichirCompteur])

  useEffect(() => {
    // Observer la connexion réseau
    const arreterObservation = observerConnexion((enLigne) => {
      setEtat((prev) => ({ ...prev, enLigne }))
    })

    // Démarrer la synchronisation automatique
    const arreterSurveillance = demarrerSurveillanceReseau()

    // Rafraîchir le compteur initial
    rafraichirCompteur()

    // Rafraîchir le compteur toutes les 10 secondes
    const intervalle = setInterval(rafraichirCompteur, 10000)

    return () => {
      arreterObservation()
      arreterSurveillance()
      clearInterval(intervalle)
    }
  }, [rafraichirCompteur])

  return {
    ...etat,
    synchroniserMaintenant,
    rafraichirCompteur,
  }
}
