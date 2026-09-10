// ===========================================
// Event-Gérance Pro — Gestion IndexedDB (Offline)
// ===========================================

import { openDB, type IDBPDatabase } from 'idb'
import type { ActionHorsLigne } from '@/types'

const NOM_BDD = 'event-gerance-pro-offline'
const VERSION = 1

interface SchemaHorsLigne {
  'actions-en-attente': {
    key: string
    value: ActionHorsLigne
    indexes: {
      'par-entite': string
      'par-horodatage': Date
    }
  }
  'cache-donnees': {
    key: string
    value: {
      cle: string
      donnees: unknown
      expiration: number
    }
  }
}

let instanceBdd: IDBPDatabase<SchemaHorsLigne> | null = null

/**
 * Ouvre ou récupère la connexion IndexedDB
 */
export async function ouvrirBdd(): Promise<IDBPDatabase<SchemaHorsLigne>> {
  if (instanceBdd) return instanceBdd

  instanceBdd = await openDB<SchemaHorsLigne>(NOM_BDD, VERSION, {
    upgrade(bdd) {
      // Store pour les actions en attente de synchronisation
      const storeActions = bdd.createObjectStore('actions-en-attente', {
        keyPath: 'id',
      })
      storeActions.createIndex('par-entite', 'entite')
      storeActions.createIndex('par-horodatage', 'horodatage')

      // Store pour le cache de données
      bdd.createObjectStore('cache-donnees', {
        keyPath: 'cle',
      })
    },
  })

  return instanceBdd
}

/**
 * Ajoute une action à la file d'attente de synchronisation
 */
export async function ajouterActionEnAttente(action: Omit<ActionHorsLigne, 'id' | 'horodatage' | 'tentatives'>): Promise<string> {
  const bdd = await ouvrirBdd()
  const id = crypto.randomUUID()
  const actionComplete: ActionHorsLigne = {
    ...action,
    id,
    horodatage: new Date(),
    tentatives: 0,
  }
  await bdd.add('actions-en-attente', actionComplete)
  return id
}

/**
 * Récupère toutes les actions en attente
 */
export async function recupererActionsEnAttente(): Promise<ActionHorsLigne[]> {
  const bdd = await ouvrirBdd()
  return bdd.getAll('actions-en-attente')
}

/**
 * Compte les actions en attente
 */
export async function compterActionsEnAttente(): Promise<number> {
  const bdd = await ouvrirBdd()
  return bdd.count('actions-en-attente')
}

/**
 * Supprime une action synchronisée
 */
export async function supprimerAction(id: string): Promise<void> {
  const bdd = await ouvrirBdd()
  await bdd.delete('actions-en-attente', id)
}

/**
 * Met à jour le compteur de tentatives d'une action
 */
export async function incrementerTentatives(id: string): Promise<void> {
  const bdd = await ouvrirBdd()
  const action = await bdd.get('actions-en-attente', id)
  if (action) {
    action.tentatives += 1
    await bdd.put('actions-en-attente', action)
  }
}

/**
 * Met en cache des données pour utilisation hors-ligne
 */
export async function mettreEnCache(cle: string, donnees: unknown, dureeMs: number = 3600000): Promise<void> {
  const bdd = await ouvrirBdd()
  await bdd.put('cache-donnees', {
    cle,
    donnees,
    expiration: Date.now() + dureeMs,
  })
}

/**
 * Récupère des données depuis le cache
 */
export async function recupererDuCache<T>(cle: string): Promise<T | null> {
  const bdd = await ouvrirBdd()
  const entree = await bdd.get('cache-donnees', cle)
  if (!entree) return null
  if (entree.expiration < Date.now()) {
    await bdd.delete('cache-donnees', cle)
    return null
  }
  return entree.donnees as T
}

/**
 * Vide tout le cache expiré
 */
export async function nettoyerCache(): Promise<void> {
  const bdd = await ouvrirBdd()
  const toutesEntrees = await bdd.getAll('cache-donnees')
  const maintenant = Date.now()
  for (const entree of toutesEntrees) {
    if (entree.expiration < maintenant) {
      await bdd.delete('cache-donnees', entree.cle)
    }
  }
}
