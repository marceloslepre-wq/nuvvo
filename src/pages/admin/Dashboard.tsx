import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  getVisitLogs,
  getAllVisitLogs,
  getTotalVisitCount,
  getTodayVisitCount,
  type VisitLog,
} from '@/services/visit-logs'
import { formatChartDate } from '@/lib/visit-utils'
import { VisitFilters, type VisitFilterState } from '@/components/admin/visit-filters'
import { VisitSummaryCards, type VisitStats } from '@/components/admin/visit-summary-cards'
import { VisitTrendChart, type TrendPoint } from '@/components/admin/visit-trend-chart'
import { VisitModalityChart, type ModalityPoint } from '@/components/admin/visit-modality-chart'
import { VisitEventsTable } from '@/components/admin/visit-events-table'
import { useRealtime } from '@/hooks/use-realtime'
import { BarChart3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useTenant } from '@/contexts/tenant-context'

export default function AdminDashboard() {
  const { activeAdminTenant } = useTenant()
  const [filter, setFilter] = useState<VisitFilterState>({
    periodDays: 30,
    modality: 'all',
    onlyBrazil: true,
  })
  const [appliedFilter, setAppliedFilter] = useState<VisitFilterState>(filter)
  const [logs, setLogs] = useState<VisitLog[]>([])
  const [allLogs, setAllLogs] = useState<VisitLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const tenantFilter = {
        ...appliedFilter,
        tenantId: activeAdminTenant?.id,
      }
      const [items, periodRecords, totalItems, today] = await Promise.all([
        getVisitLogs(tenantFilter),
        getAllVisitLogs(tenantFilter),
        getTotalVisitCount(tenantFilter),
        getTodayVisitCount(activeAdminTenant?.id, appliedFilter.onlyBrazil),
      ])
      setLogs(items)
      setAllLogs(periodRecords)
      setTotalCount(totalItems)
      setTodayCount(today)
    } catch {
      setLogs([])
      setAllLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [appliedFilter, activeAdminTenant?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('visit_logs', () => {
    loadData()
  })

  const stats: VisitStats = useMemo(() => {
    const total = totalCount
    const sourceForAggregates = allLogs.length > 0 ? allLogs : logs
    const unique = new Set(sourceForAggregates.map((l) => l.session_id).filter(Boolean)).size
    const clicks = sourceForAggregates.filter((l) => l.type === 'click').length
    const pageviews = sourceForAggregates.filter((l) => l.type === 'pageview').length
    const clickRate = pageviews > 0 ? (clicks / pageviews) * 100 : 0
    return { total, today: todayCount, unique, clickRate }
  }, [totalCount, allLogs, logs, todayCount])

  const trendData: TrendPoint[] = useMemo(() => {
    const days = appliedFilter.periodDays > 0 ? appliedFilter.periodDays : 30
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      map.set(formatChartDate(d), 0)
    }
    const sourceForAggregates = allLogs.length > 0 ? allLogs : logs
    sourceForAggregates.forEach((log) => {
      const d = new Date(log.created)
      d.setHours(0, 0, 0, 0)
      const key = formatChartDate(d)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([date, visits]) => ({ date, visits }))
  }, [allLogs, logs, appliedFilter.periodDays])

  const modalityData: ModalityPoint[] = useMemo(() => {
    const map = new Map<string, number>()
    const sourceForAggregates = allLogs.length > 0 ? allLogs : logs
    sourceForAggregates.forEach((log) => {
      const m = log.modality || 'unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([modality, count]) => ({ modality, count }))
      .sort((a, b) => b.count - a.count)
  }, [allLogs, logs])

  const handleApply = () => {
    setAppliedFilter(filter)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <VisitFilters value={filter} onChange={setFilter} onApply={handleApply} />

      <VisitSummaryCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <VisitTrendChart data={trendData} />
        <VisitModalityChart data={modalityData} />
      </div>

      <VisitEventsTable logs={logs} totalCount={totalCount} />
    </div>
  )
}
