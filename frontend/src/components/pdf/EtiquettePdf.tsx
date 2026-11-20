import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Colis } from '@/types'

const ROUGE = '#E51C23'
const ORANGE = '#F7941D'
const CYAN = '#2196c9'
const SOMBRE = '#111827'
const GRIS = '#6b7280'

const styles = StyleSheet.create({
  page: {
    width: '100mm',
    height: '150mm',
    padding: '5mm',
    color: SOMBRE,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ROUGE,
    paddingBottom: 5,
  },
  marque: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: ROUGE,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  identite: {
    marginLeft: 8,
    flex: 1,
  },
  marqueNom: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  marqueRouge: { color: ROUGE },
  marqueCyan: { color: CYAN },
  marqueSous: {
    fontSize: 6.5,
    color: GRIS,
    marginTop: 2,
  },
  docType: {
    fontSize: 7,
    fontWeight: 'bold',
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right',
    flexShrink: 0,
  },
  numero: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: SOMBRE,
    borderRadius: 5,
    paddingVertical: 6,
    alignItems: 'center',
  },
  numeroLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    color: GRIS,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  numeroValeur: {
    fontFamily: 'Courier',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  qr: {
    marginTop: 8,
    alignItems: 'center',
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  qrLegende: {
    marginTop: 2,
    fontSize: 6.5,
    color: '#4b5563',
  },
  route: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  routeCol: {
    flex: 1,
  },
  routeColDroite: {
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  etiquette: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  routeCode: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  routeNom: {
    fontSize: 7,
    color: '#4b5563',
    marginTop: 1,
  },
  fleche: {
    fontSize: 11,
    color: ROUGE,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    alignSelf: 'center',
  },
  destinataire: {
    marginTop: 6,
    borderLeftWidth: 6,
    borderLeftColor: ORANGE,
    backgroundColor: '#fff8ef',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  destinataireNom: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  destinataireTel: {
    fontSize: 8,
    color: '#374151',
    marginTop: 2,
  },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    borderTopStyle: 'dashed',
    paddingTop: 4,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 6,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValeur: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  fragile: {
    marginTop: 6,
    backgroundColor: ROUGE,
    color: '#ffffff',
    borderRadius: 4,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  pied: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6,
    color: '#9ca3af',
    paddingTop: 4,
  },
})

function tronquer(texte: string | null | undefined, max: number): string {
  if (!texte) return '—'
  return texte.length > max ? texte.slice(0, max - 1).trimEnd() + '…' : texte
}

function formaterPoids(poids: number | null | undefined): string {
  const n = Number(poids ?? 0)
  if (!n) return '—'
  const texte = n.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
  return `${texte} kg`
}

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return '—'
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function EtiquetteDocument({ colis, qrDataUrl }: { colis: Colis; qrDataUrl: string }) {
  const fragile = colis.type_colis?.fragile === true

  return (
    <Document>
      <Page size={{ width: '100mm', height: '150mm' }} style={styles.page}>
        <View style={styles.header}>
          <View style={styles.marque}>
            <Text>ADC</Text>
          </View>
          <View style={styles.identite}>
            <Text style={styles.marqueNom}>
              <Text style={styles.marqueRouge}>ADC</Text> EXPRESS <Text style={styles.marqueCyan}>RDC</Text>
            </Text>
            <Text style={styles.marqueSous}>Logistique & Colis · République Démocratique du Congo</Text>
          </View>
          <Text style={styles.docType}>Étiquette{'\n'}colis</Text>
        </View>

        <View style={styles.numero}>
          <Text style={styles.numeroLabel}>N° de suivi</Text>
          <Text style={styles.numeroValeur}>{colis.numero_suivi}</Text>
        </View>

        <View style={styles.qr}>
          <Image src={qrDataUrl} style={styles.qrImage} />
          <Text style={styles.qrLegende}>Scannez pour suivre ce colis</Text>
        </View>

        <View style={styles.route}>
          <View style={styles.routeCol}>
            <Text style={styles.etiquette}>Dépôt</Text>
            <Text style={styles.routeCode}>{colis.agence_depot?.code ?? '—'}</Text>
            <Text style={styles.routeNom}>{tronquer(colis.agence_depot?.nom, 34)}</Text>
          </View>
          <Text style={styles.fleche}>→</Text>
          <View style={styles.routeColDroite}>
            <Text style={styles.etiquette}>Destination</Text>
            <Text style={styles.routeCode}>{colis.agence_destination?.code ?? '—'}</Text>
            <Text style={styles.routeNom}>{tronquer(colis.agence_destination?.nom, 34)}</Text>
          </View>
        </View>

        <View style={styles.destinataire}>
          <Text style={styles.etiquette}>Destinataire</Text>
          <Text style={styles.destinataireNom}>{colis.nom_destinataire}</Text>
          {colis.telephone_destinataire ? (
            <Text style={styles.destinataireTel}>Tél. {colis.telephone_destinataire}</Text>
          ) : null}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Type de colis</Text>
            <Text style={styles.metaValeur}>{tronquer(colis.type_colis?.libelle, 16)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Poids</Text>
            <Text style={styles.metaValeur}>{formaterPoids(colis.poids_kg)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Déposé le</Text>
            <Text style={styles.metaValeur}>{formaterDate(colis.date_depot)}</Text>
          </View>
        </View>

        {fragile ? (
          <View style={styles.fragile}>
            <Text>FRAGILE — MANIPULER AVEC PRÉCAUTION</Text>
          </View>
        ) : null}

        <View style={styles.pied}>
          <Text>{colis.ville_destination?.nom ? `Destination : ${colis.ville_destination.nom}` : 'ADC EXPRESS RDC'}</Text>
          <Text>Conservez ce colis à l'abri de l'humidité</Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Génère le PDF de l'étiquette et déclenche son téléchargement.
 */
export async function telechargerEtiquette(colis: Colis, qrDataUrl: string): Promise<void> {
  const blob = await pdf(<EtiquetteDocument colis={colis} qrDataUrl={qrDataUrl} />).toBlob()
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `etiquette-${colis.numero_suivi}.pdf`
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
