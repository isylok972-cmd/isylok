// ===========================================
// Event-Gérance Pro — Utilitaires CSS (clsx)
// ===========================================

import { clsx, type ClassValue } from 'clsx'

/**
 * Fusionne des classes CSS conditionnellement
 * Exemple: cn('base', condition && 'classe-active', 'toujours')
 */
export function cn(...entrees: ClassValue[]) {
  return clsx(entrees)
}

/**
 * Formate un montant en euros
 */
export function formaterPrix(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant)
}

/**
 * Formate une date en français
 */
export function formaterDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Formate une date et heure en français
 */
export function formaterDateHeure(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Génère un numéro séquentiel formaté
 * Ex: genererNumero('DEV', 2026, 42) → 'DEV-2026-0042'
 */
export function genererNumero(prefixe: string, annee: number, sequence: number): string {
  return `${prefixe}-${annee}-${String(sequence).padStart(4, '0')}`
}

/**
 * Calcule le montant TTC à partir du HT
 */
export function calculerTtc(montantHt: number, tauxTva: number = 20): number {
  return Math.round(montantHt * (1 + tauxTva / 100) * 100) / 100
}

/**
 * Calcule la marge nette
 */
export function calculerMarge(prixVente: number, coutAchat: number): number {
  return Math.round((prixVente - coutAchat) * 100) / 100
}

/**
 * Tronque un texte avec des points de suspension
 */
export function tronquer(texte: string, longueurMax: number): string {
  if (texte.length <= longueurMax) return texte
  return texte.slice(0, longueurMax) + '…'
}
