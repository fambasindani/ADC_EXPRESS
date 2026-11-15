import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { api } from '@/lib/api'
import { downloadPdf } from '@/lib/downloadPdf'
import { formatMoney, formatDateTime } from '@/lib/format'

export interface FacturePdfData {
  numero_facture: string
  montant_total: string | number
  devise_code: string
  date_facture: string
  statut: string
  colis?: {
    numero_suivi: string
    nom_expediteur: string
    telephone_expediteur?: string | null
    nom_destinataire: string
    telephone_destinataire?: string | null
    agence_depot?: { nom: string } | null
    agence_destination?: { nom: string } | null
  } | null
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1A1A1A', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 3,
    borderBottomColor: '#E51C23',
    paddingBottom: 12,
    marginBottom: 8,
  },
  brand: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  brandAccent: { color: '#E51C23' },
  brandCyan: { color: '#33B5E5' },
  subtitle: { fontSize: 8, color: '#666666', marginTop: 2 },
  docType: { fontSize: 9, color: '#E51C23', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: 'bold', color: '#E51C23', textAlign: 'center', marginVertical: 10 },
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
  amount: { fontSize: 13, fontWeight: 'bold', color: '#E51C23' },
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

export function FactureDocument({
  facture,
  montantPaye,
  solde,
}: {
  facture: FacturePdfData
  montantPaye: number
  solde: number
}) {
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
          <Text style={styles.docType}>Facture</Text>
        </View>

        <Text style={styles.title}>FACTURE</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>N de facture</Text>
            <Text style={styles.value}>{facture.numero_facture}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDateTime(facture.date_facture)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Statut</Text>
            <Text style={styles.value}>{facture.statut}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>N de suivi</Text>
            <Text style={styles.value}>{facture.colis?.numero_suivi ?? '-'}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Expediteur (client)</Text>
          <Text style={{ fontWeight: 'bold' }}>{facture.colis?.nom_expediteur ?? '-'}</Text>
          {facture.colis?.telephone_expediteur ? <Text>{facture.colis.telephone_expediteur}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <Text style={{ fontWeight: 'bold' }}>{facture.colis?.nom_destinataire ?? '-'}</Text>
          {facture.colis?.telephone_destinataire ? <Text>{facture.colis.telephone_destinataire}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Trajet</Text>
          <Text>
            {facture.colis?.agence_depot?.nom ?? '-'} {'->'} {facture.colis?.agence_destination?.nom ?? '-'}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Montant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Montant total</Text>
            <Text style={styles.amount}>{formatMoney(facture.montant_total, facture.devise_code)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Deja paye</Text>
            <Text style={styles.value}>{formatMoney(montantPaye, facture.devise_code)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Solde</Text>
            <Text style={styles.value}>{formatMoney(solde, facture.devise_code)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          ADC EXPRESS RDC - Document genere le {formatDateTime(new Date().toISOString())}. Merci de conserver cette facture.
        </Text>
      </Page>
    </Document>
  )
}

export async function downloadFacturePdf(id: number) {
  const res = await api.get<{ facture: FacturePdfData; montant_paye: number; solde: number }>(`/factures/${id}`)
  const { facture, montant_paye, solde } = res.data
  await downloadPdf(
    <FactureDocument facture={facture} montantPaye={montant_paye} solde={solde} />,
    `facture-${facture.numero_facture}.pdf`,
  )
}
