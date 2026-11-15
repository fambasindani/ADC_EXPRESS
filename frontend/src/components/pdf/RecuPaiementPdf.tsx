import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { api } from '@/lib/api'
import { downloadPdf } from '@/lib/downloadPdf'
import { formatMoney, formatDateTime } from '@/lib/format'

export interface PaiementRecuData {
  reference_paiement: string
  montant: string | number
  devise_code: string
  moment_paiement: string
  date_paiement: string
  colis?: { numero_suivi: string; nom_expediteur: string; nom_destinataire: string } | null
  facture?: { numero_facture: string } | null
  agence?: { nom: string; adresse?: string; telephone?: string } | null
  modePaiement?: { libelle: string } | null
  encaissePar?: { nom: string; prenom: string } | null
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1A1A1A', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 3,
    borderBottomColor: '#33B5E5',
    paddingBottom: 12,
    marginBottom: 8,
  },
  brand: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  brandAccent: { color: '#E51C23' },
  brandCyan: { color: '#33B5E5' },
  subtitle: { fontSize: 8, color: '#666666', marginTop: 2 },
  docType: { fontSize: 9, color: '#33B5E5', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: 'bold', color: '#33B5E5', textAlign: 'center', marginVertical: 10 },
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
  amount: { fontSize: 15, fontWeight: 'bold', color: '#E51C23' },
  amountWords: { fontSize: 9, color: '#666666', fontStyle: 'italic', marginTop: 2 },
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

export function RecuPaiementDocument({
  paiement,
  montantLettres,
}: {
  paiement: PaiementRecuData
  montantLettres?: string
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
          <Text style={styles.docType}>Recu de paiement</Text>
        </View>

        <Text style={styles.title}>RECU DE PAIEMENT</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{paiement.reference_paiement}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDateTime(paiement.date_paiement)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mode</Text>
            <Text style={styles.value}>{paiement.modePaiement?.libelle ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Moment</Text>
            <Text style={styles.value}>{paiement.moment_paiement}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>N de facture</Text>
            <Text style={styles.value}>{paiement.facture?.numero_facture ?? '-'}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Montant</Text>
          <Text style={styles.amount}>{formatMoney(paiement.montant, paiement.devise_code)}</Text>
          {montantLettres ? <Text style={styles.amountWords}>{montantLettres}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Colis</Text>
          <View style={styles.row}>
            <Text style={styles.label}>N de suivi</Text>
            <Text style={styles.value}>{paiement.colis?.numero_suivi ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expediteur</Text>
            <Text style={styles.value}>{paiement.colis?.nom_expediteur ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Destinataire</Text>
            <Text style={styles.value}>{paiement.colis?.nom_destinataire ?? '-'}</Text>
          </View>
        </View>

        {paiement.agence ? (
          <View>
            <Text style={styles.sectionTitle}>Agence</Text>
            <Text>{paiement.agence.nom}</Text>
            {paiement.agence.adresse ? <Text>{paiement.agence.adresse}</Text> : null}
          </View>
        ) : null}

        {paiement.encaissePar ? (
          <View>
            <Text style={styles.sectionTitle}>Encaisse par</Text>
            <Text>
              {paiement.encaissePar.prenom ?? ''} {paiement.encaissePar.nom}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          ADC EXPRESS RDC - Document genere le {formatDateTime(new Date().toISOString())}. Ce recu fait office de quittance.
        </Text>
      </Page>
    </Document>
  )
}

export async function downloadRecuPaiementPdf(id: number) {
  const res = await api.get<{ paiement: PaiementRecuData; montant_lettres: string }>(`/paiements/${id}/recu`)
  const { paiement, montant_lettres } = res.data
  await downloadPdf(
    <RecuPaiementDocument paiement={paiement} montantLettres={montant_lettres} />,
    `recu-${paiement.reference_paiement}.pdf`,
  )
}
