import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { downloadPdf } from '@/lib/downloadPdf'

export interface EtatColumn {
  header: string
  /** Largeur en pourcentage, ex. "12%". Par défaut : répartition égale. */
  width?: string
  align?: 'left' | 'right' | 'center'
}

export interface EtatResume {
  label: string
  value: string
}

export interface EtatPdfData {
  titre: string
  sousTitre?: string
  periode?: string
  agence?: string
  colonnes: EtatColumn[]
  lignes: (string | number)[][]
  resume?: EtatResume[]
  orientation?: 'portrait' | 'landscape'
  fichier?: string
}

export function pdfText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function pdfDate(value: string | null | undefined): string {
  if (!value) return '-'
  // Évite le décalage de fuseau horaire pour les dates "YYYY-MM-DD".
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR')
}

export function pdfDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const date = d.toLocaleDateString('fr-FR')
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

export function pdfMoney(value: number | string | null | undefined, devise?: string | null): string {
  const n = Number(value ?? 0)
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(Number.isFinite(n) ? n : 0)
    .replace(/[\u00a0\u202f]/g, ' ')
  return devise ? `${formatted} ${devise}` : formatted
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 104,
    paddingBottom: 40,
    paddingHorizontal: 22,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#1A1A1A',
  },
  header: {
    position: 'absolute',
    top: 16,
    left: 22,
    right: 22,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#E51C23',
    paddingBottom: 5,
  },
  brand: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
  brandAccent: { color: '#E51C23' },
  brandCyan: { color: '#33B5E5' },
  brandSub: { fontSize: 6.5, color: '#666666', marginTop: 1 },
  docType: { fontSize: 7, color: '#F7941D', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 11, fontWeight: 'bold', color: '#E51C23', marginTop: 5 },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    color: '#666666',
    fontSize: 6.8,
  },
  tableHeader: {
    position: 'absolute',
    top: 82,
    left: 22,
    right: 22,
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  th: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 6.8 },
  row: {
    flexDirection: 'row',
    paddingVertical: 3.4,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  rowAlt: { backgroundColor: '#F7F9FC' },
  td: { fontSize: 6.8 },
  empty: { padding: 16, textAlign: 'center', color: '#999999', fontSize: 8 },
  summary: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' },
  summaryBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 6,
    minWidth: 110,
  },
  summaryLabel: { fontSize: 6.2, color: '#666666', textTransform: 'uppercase' },
  summaryValue: { fontSize: 9, fontWeight: 'bold', color: '#1A1A1A', marginTop: 1 },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 22,
    right: 22,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.3,
    color: '#999999',
  },
})

export function EtatDocument({ data }: { data: EtatPdfData }) {
  const columns = data.colonnes
  const defaultWidth = `${100 / Math.max(columns.length, 1)}%`

  return (
    <Document>
      <Page size="A4" orientation={data.orientation ?? 'landscape'} style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brand}>
                ADC <Text style={styles.brandAccent}>EXPRESS</Text> <Text style={styles.brandCyan}>RDC</Text>
              </Text>
              <Text style={styles.brandSub}>Logistique & Colis - Republique Democratique du Congo</Text>
            </View>
            <Text style={styles.docType}>Etat / Rapport</Text>
          </View>
          <Text style={styles.title}>{data.titre}</Text>
          <View style={styles.meta}>
            <Text>{data.sousTitre ?? ''}</Text>
            <Text>{data.periode ? `Periode : ${data.periode}` : ''}</Text>
            <Text>{data.agence ? `Agence : ${data.agence}` : ''}</Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          {columns.map((c, i) => (
            <Text
              key={i}
              style={[styles.th, { width: c.width ?? defaultWidth, textAlign: c.align ?? 'left' }]}
            >
              {c.header}
            </Text>
          ))}
        </View>

        {data.lignes.length === 0 ? (
          <Text style={styles.empty}>Aucun enregistrement pour cette periode.</Text>
        ) : (
          data.lignes.map((cells, ri) => (
            <View key={ri} style={ri % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
              {cells.map((cell, ci) => (
                <Text
                  key={ci}
                  style={[
                    styles.td,
                    {
                      width: columns[ci]?.width ?? defaultWidth,
                      textAlign: columns[ci]?.align ?? 'left',
                    },
                  ]}
                >
                  {pdfText(cell)}
                </Text>
              ))}
            </View>
          ))
        )}

        {data.resume && data.resume.length > 0 && (
          <View style={styles.summary} wrap={false}>
            {data.resume.map((r, i) => (
              <View key={i} style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>{r.label}</Text>
                <Text style={styles.summaryValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            ADC EXPRESS RDC - {data.titre} - Document genere le {pdfDateTime(new Date().toISOString())}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function telechargerEtatPdf(data: EtatPdfData) {
  const fichier = data.fichier ?? `etat-${Date.now()}.pdf`
  await downloadPdf(<EtatDocument data={data} />, fichier)
}
