import { useEffect, useState } from 'react'
import {
  Package,
  Truck,
  PackageCheck,
  CheckCircle2,
  Wallet,
  PackageOpen,
  TrendingUp,
  CalendarDays,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api } from '@/lib/api'
import { formatMoney, formatDateTime } from '@/lib/format'
import { STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Colis } from '@/types'

interface StatsData {
  kpi: {
    total_colis: number
    en_transit: number
    arrive_agence: number
    en_attente_paiement: number
    livres: number
    annules: number
    aujourdhui: number
    semaine: number
    mois: number
  }
  recettes: { jour: { usd: number; cdf: number }; mois: { usd: number; cdf: number } }
  colis_recents: Colis[]
  par_statut: Record<string, number>
  par_mode_facturation: { mode_facturation: string; total: number; montant: string }[]
}

interface ChartsData {
  colis_par_jour: { jour: string; total: number }[]
  recettes_par_jour: { jour: string; usd: string; cdf: string }[]
}

const PIE_COLORS = [
  '#E51C23',
  '#33B5E5',
  '#F7941D',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#64748b',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#ec4899',
  '#84cc16',
]

const STATUT_LIBELLES: Record<string, string> = {
  ENREGISTRE: 'Enregistré',
  EN_ATTENTE_PAIEMENT: 'Attente paiement',
  PRET_EXPEDITION: "Prêt à expédier",
  EN_TRANSIT: 'En transit',
  ARRIVE_AGENCE: 'Arrivé agence',
  EN_LIVRAISON: 'En livraison',
  LIVRE: 'Livré',
  RETIRE: 'Retiré',
  ANNULE: 'Annulé',
  PERDU: 'Perdu',
  ENDOMMAGE: 'Endommagé',
  RETOUR: 'Retourné',
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: string
}

function BarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-brand-border bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-brand-dark">{label}</p>
      <p className="mt-0.5 text-slate-600">{payload[0].value} colis</p>
    </div>
  )
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-brand-border bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-brand-dark">{payload[0].name}</p>
      <p className="mt-0.5 text-slate-600">{payload[0].value} colis</p>
    </div>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [charts, setCharts] = useState<ChartsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get<StatsData>('/dashboard/stats'), api.get<ChartsData>('/dashboard/charts?days=30')])
      .then(([s, c]) => {
        setStats(s.data)
        setCharts(c.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  const kpi = stats?.kpi
  const recettes = stats?.recettes

  const pieRows = Object.entries(stats?.par_statut ?? {})
    .map(([name, value]) => ({
      name,
      value,
      libelle: STATUT_LIBELLES[name] ?? name,
    }))
    .sort((a, b) => b.value - a.value)

  const pieTotal = pieRows.reduce((somme, r) => somme + r.value, 0)

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue d'ensemble de l'activité logistique et des encaissements.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs text-slate-500 shadow-card">
          <CalendarDays className="h-3.5 w-3.5 text-brand-red" />
          30 derniers jours
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total colis"
          value={kpi?.total_colis ?? 0}
          icon={Package}
          accent="red"
          hint={kpi ? `Ce mois : ${kpi.mois}` : undefined}
        />
        <StatCard title="En transit" value={kpi?.en_transit ?? 0} icon={Truck} accent="cyan" />
        <StatCard title="Arrivés agence" value={kpi?.arrive_agence ?? 0} icon={PackageOpen} accent="orange" />
        <StatCard title="Livrés / retirés" value={kpi?.livres ?? 0} icon={PackageCheck} accent="green" />
        <StatCard
          title="Attente paiement"
          value={kpi?.en_attente_paiement ?? 0}
          icon={Wallet}
          accent="slate"
        />
        <StatCard
          title="Aujourd'hui"
          value={kpi?.aujourdhui ?? 0}
          icon={CheckCircle2}
          accent="green"
          hint={kpi ? `Cette semaine : ${kpi.semaine}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Colis créés</CardTitle>
              <CardDescription>Évolution quotidienne des enregistrements</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {(charts?.colis_par_jour?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Aucune donnée sur la période.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.colis_par_jour ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barColis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E51C23" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#F7941D" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Colis" fill="url(#barColis)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
            <CardDescription>{pieTotal} colis au total</CardDescription>
          </CardHeader>
          <CardContent>
            {pieRows.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune donnée.</p>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieRows}
                        dataKey="value"
                        nameKey="libelle"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {pieRows.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-brand-dark">{pieTotal}</span>
                    <span className="text-[11px] text-slate-400">colis</span>
                  </div>
                </div>

                <ul className="w-full flex-1 space-y-1.5">
                  {pieRows.map((r, i) => {
                    const pct = pieTotal > 0 ? Math.round((r.value / pieTotal) * 100) : 0
                    return (
                      <li key={r.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="flex-1 truncate text-slate-600">{r.libelle}</span>
                        <span className="font-semibold text-brand-dark">{r.value}</span>
                        <span className="w-9 text-right text-xs text-slate-400">{pct}%</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-orange" /> Recettes encaissées
            </CardTitle>
            <CardDescription>Paiements validés (USD / CDF)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Aujourd'hui</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-brand-cyanLight p-4">
                  <p className="text-sm text-slate-500">USD</p>
                  <p className="text-2xl font-bold text-brand-cyan">{formatMoney(recettes?.jour.usd, 'USD')}</p>
                </div>
                <div className="rounded-lg bg-brand-orangeLight p-4">
                  <p className="text-sm text-slate-500">CDF</p>
                  <p className="text-2xl font-bold text-brand-orange">{formatMoney(recettes?.jour.cdf, 'CDF')}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ce mois</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">USD</p>
                  <p className="text-2xl font-bold text-brand-dark">{formatMoney(recettes?.mois.usd, 'USD')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">CDF</p>
                  <p className="text-2xl font-bold text-brand-dark">{formatMoney(recettes?.mois.cdf, 'CDF')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Colis récents</span>
              <Link to="/colis" className="text-sm font-medium text-brand-red hover:underline">
                Voir tout
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.colis_recents ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucun colis enregistré pour le moment.</p>
            ) : (
              (stats?.colis_recents ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-border px-3 py-2 transition-shadow hover:shadow-card-hover"
                >
                  <div className="min-w-0">
                    <Link to={`/colis/${c.id}`} className="truncate font-semibold text-brand-dark hover:text-brand-red">
                      {c.numero_suivi}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {c.nom_destinataire} · {formatDateTime(c.date_depot)}
                    </p>
                  </div>
                  <Badge className={STATUT_COLIS_STYLE[c.statut as StatutColis] ?? ''}>{c.statut}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
