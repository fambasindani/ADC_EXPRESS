import { useEffect, useState } from 'react'
import {
  Package,
  Truck,
  PackageCheck,
  CheckCircle2,
  Wallet,
  PackageOpen,
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

const PIE_COLORS = ['#D92528', '#00A3E0', '#F39200', '#10b981', '#6366f1', '#f59e0b', '#94a3b8']

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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const kpi = stats?.kpi
  const recettes = stats?.recettes
  const pieData = Object.entries(stats?.par_statut ?? {}).map(([name, value]) => ({ name, value }))

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vue d'ensemble de l'activité logistique et des encaissements.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total colis" value={kpi?.total_colis ?? 0} icon={Package} accent="red" />
        <StatCard title="En transit" value={kpi?.en_transit ?? 0} icon={Truck} accent="cyan" />
        <StatCard title="Arrivés agence" value={kpi?.arrive_agence ?? 0} icon={PackageOpen} accent="orange" />
        <StatCard title="Livrés / retirés" value={kpi?.livres ?? 0} icon={PackageCheck} accent="green" />
        <StatCard
          title="Attente paiement"
          value={kpi?.en_attente_paiement ?? 0}
          icon={Wallet}
          accent="slate"
        />
        <StatCard title="Aujourd'hui" value={kpi?.aujourdhui ?? 0} icon={CheckCircle2} accent="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Colis créés (30 derniers jours)</CardTitle>
            <CardDescription>Évolution quotidienne des enregistrements</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.colis_par_jour ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="total" name="Colis" fill="#E51C23" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune donnée.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recettes du jour</CardTitle>
          </CardHeader>
          <CardContent>
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
            {(stats?.colis_recents ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border px-3 py-2">
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
