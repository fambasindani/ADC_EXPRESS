import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import type { Colis } from '@/types'
import { formatMoney, formatDateTime } from '@/lib/format'

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
    borderBottomColor: '#E51C23',
    paddingBottom: 12,
    marginBottom: 8,
  },
  brand: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  brandAccent: { color: '#E51C23' },
  brandCyan: { color: '#33B5E5' },
  subtitle: { fontSize: 8, color: '#666666', marginTop: 2 },
  docType: { fontSize: 9, color: '#F7941D', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: 'bold', color: '#E51C23', textAlign: 'center', marginVertical: 10 },
  box: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
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
  barcode: {
    textAlign: 'center',
    fontFamily: 'Courier',
    fontSize: 12,
    letterSpacing: 2,
    color: '#1A1A1A',
  },
})

export function BordereauDocument({ colis }: { colis: Colis }) {
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
          <Text style={styles.docType}>Bordereau d'expedition</Text>
        </View>

        <Text style={styles.title}>BORDEREAU D'EXPEDITION</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>N de suivi</Text>
            <Text style={styles.value}>{colis.numero_suivi}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date de depot</Text>
            <Text style={styles.value}>{formatDateTime(colis.date_depot)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Statut</Text>
            <Text style={styles.value}>{colis.statut}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Facturation</Text>
            <Text style={styles.value}>
              {colis.mode_facturation === 'PAYE_AU_DEPOT' ? 'Paye au depot' : 'Paye au retrait'}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Expediteur</Text>
          <Text style={{ fontWeight: 'bold' }}>{colis.nom_expediteur}</Text>
          <Text>{colis.telephone_expediteur}</Text>
          {colis.adresse_expediteur ? <Text>{colis.adresse_expediteur}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <Text style={{ fontWeight: 'bold' }}>{colis.nom_destinataire}</Text>
          <Text>{colis.telephone_destinataire}</Text>
          {colis.email_destinataire ? <Text>{colis.email_destinataire}</Text> : null}
          {colis.adresse_destinataire ? <Text>{colis.adresse_destinataire}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Trajet</Text>
          <Text>
            {colis.agence_depot?.nom ?? '-'} {'->'} {colis.agence_destination?.nom ?? '-'}
          </Text>
          {colis.date_estimee_arrivee ? (
            <Text>Arrivee estimee : {formatDateTime(colis.date_estimee_arrivee)}</Text>
          ) : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Caracteristiques</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{colis.type_colis?.libelle ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Poids</Text>
            <Text style={styles.value}>{colis.poids_kg} kg</Text>
          </View>
          {colis.description_contenu ? (
            <View style={styles.row}>
              <Text style={styles.label}>Contenu</Text>
              <Text style={styles.value}>{colis.description_contenu}</Text>
            </View>
          ) : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Tarification</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Montant transport</Text>
            <Text style={styles.amount}>{formatMoney(colis.montant_transport, colis.devise_paiement)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Deja paye</Text>
            <Text style={styles.value}>{formatMoney(colis.montant_paye ?? 0, colis.devise_paiement)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Solde</Text>
            <Text style={styles.value}>{formatMoney(colis.solde ?? 0, colis.devise_paiement)}</Text>
          </View>
        </View>

        <Text style={styles.barcode}>{colis.numero_suivi}</Text>

        <Text style={styles.footer}>
          ADC EXPRESS RDC - Document genere le {formatDateTime(new Date().toISOString())}. Merci de conserver ce bordereau.
        </Text>
      </Page>
    </Document>
  )
}

export function BordereauDownloadLink({ colis }: { colis: Colis }) {
  return (
    <PDFDownloadLink
      document={<BordereauDocument colis={colis} />}
      fileName={`bordereau-${colis.numero_suivi}.pdf`}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-redDark"
    >
      {({ loading }) => (loading ? 'Generation...' : <><FileDown className="h-4 w-4" /> Bordereau PDF</>)}
    </PDFDownloadLink>
  )
}
