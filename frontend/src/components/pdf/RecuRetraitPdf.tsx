import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import { formatMoney, formatDateTime } from '@/lib/format'

export interface RecuRetraitData {
  colis?: {
    numero_suivi: string
    nom_destinataire: string
    nom_expediteur: string
    montant_transport: string | number
    devise_paiement: string
    mode_facturation: string
  } | null
  agence?: { nom: string } | null
  retire_par_nom: string
  retire_par_telephone: string
  date_retrait: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: '#1A1A1A',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 3,
    borderBottomColor: '#F7941D',
    paddingBottom: 12,
    marginBottom: 8,
  },
  brand: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  brandAccent: { color: '#E51C23' },
  brandCyan: { color: '#33B5E5' },
  subtitle: { fontSize: 8, color: '#666666', marginTop: 2 },
  docType: { fontSize: 9, color: '#F7941D', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: 'bold', color: '#F7941D', textAlign: 'center', marginVertical: 10 },
  box: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, padding: 10, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 110, color: '#666666', fontWeight: 'bold' },
  value: { flex: 1 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#F3F5F8',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 6,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    textAlign: 'center',
    color: '#999999',
    fontSize: 8,
  },
})

export function RecuRetraitDocument({ retrait }: { retrait: RecuRetraitData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              ADC <Text style={styles.brandAccent}>EXPRESS</Text> <Text style={styles.brandCyan}>RDC</Text>
            </Text>
            <Text style={styles.subtitle}>Logistique & Colis - Republique Democratique du Congo</Text>
          </View>
          <Text style={styles.docType}>Recu de retrait</Text>
        </View>

        <Text style={styles.title}>RECU DE RETRAIT</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>N de suivi</Text>
            <Text style={styles.value}>{retrait.colis?.numero_suivi ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Destinataire</Text>
            <Text style={styles.value}>{retrait.colis?.nom_destinataire ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expediteur</Text>
            <Text style={styles.value}>{retrait.colis?.nom_expediteur ?? '-'}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Retrait effectue par</Text>
          <Text style={{ fontWeight: 'bold' }}>{retrait.retire_par_nom}</Text>
          <Text>{retrait.retire_par_telephone}</Text>
          <Text>Date de retrait : {formatDateTime(retrait.date_retrait)}</Text>
          {retrait.agence ? <Text>Agence : {retrait.agence.nom}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Montant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Transport</Text>
            <Text style={styles.value}>
              {formatMoney(retrait.colis?.montant_transport ?? 0, retrait.colis?.devise_paiement)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Facturation</Text>
            <Text style={styles.value}>
              {retrait.colis?.mode_facturation === 'PAYE_AU_DEPOT' ? 'Paye au depot' : 'Paye au retrait'}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          ADC EXPRESS RDC - Document genere le {formatDateTime(new Date().toISOString())}. Ce recu fait office de preuve de remise.
        </Text>
      </Page>
    </Document>
  )
}

export function RecuRetraitDownloadLink({ retrait }: { retrait: RecuRetraitData }) {
  return (
    <PDFDownloadLink
      document={<RecuRetraitDocument retrait={retrait} />}
      fileName={`recu-retrait-${retrait.colis?.numero_suivi ?? 'colis'}.pdf`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-orange transition-colors hover:bg-brand-grayLight"
    >
      {({ loading }) => (loading ? '...' : <FileDown className="h-4 w-4" />)}
    </PDFDownloadLink>
  )
}
