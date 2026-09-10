// ============================================================================
// Isy Lok — Intégrateur Factur-X PDF/A-3 (pdf-lib)
// Insère le flux factur-x.xml dans le PDF en pièce jointe PDF/A-3
// ============================================================================

import { PDFDocument, AFRelationship } from 'pdf-lib'

/**
 * Intègre le fichier factur-x.xml dans un document PDF existant
 * Conforme aux spécifications Factur-X / ZUGFeRD 1.0 (PDF/A-3)
 */
export async function integrerFacturxDansPdf(
  bufferPdfOriginal: Uint8Array | Buffer,
  xmlContenu: string
): Promise<Uint8Array> {
  // Charger le document PDF généré
  const pdfDoc = await PDFDocument.load(bufferPdfOriginal)

  // Convertir le XML en Uint8Array
  const xmlBuffer = Buffer.from(xmlContenu, 'utf-8')
  const xmlUint8 = new Uint8Array(xmlBuffer)

  // Attacher le fichier factur-x.xml avec les métadonnées requises
  await pdfDoc.attach(xmlUint8, 'factur-x.xml', {
    mimeType: 'text/xml',
    description: 'Factur-X / ZUGFeRD Invoice XML (EN 16931)',
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Data
  })

  // Enregistrer le PDF avec la pièce jointe
  const pdfAvecFacturxBytes = await pdfDoc.save()
  return pdfAvecFacturxBytes
}
