import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { MousePointerClick, Users } from 'lucide-react'
import type { VisitLog } from '@/services/visit-logs'
import { computeClickStats, CLICK_ORIGIN_LABELS } from '@/lib/visit-click-stats'

interface VisitClickReportProps {
  logs: VisitLog[]
}

const nf = new Intl.NumberFormat('pt-BR')

export function VisitClickReport({ logs }: VisitClickReportProps) {
  const stats = useMemo(() => computeClickStats(logs), [logs])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Sessões com clique no WhatsApp
            </CardTitle>
            <div className="p-2 rounded-md bg-green-50">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nf.format(stats.clickSessions)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Cliques por origem</h3>
          </div>
          <Table>
            <caption className="sr-only">
              Sessões, sessões com clique e taxa de conversão por origem
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Com clique</TableHead>
                <TableHead className="text-right">% conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.origins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                    Nenhuma sessão no período.
                  </TableCell>
                </TableRow>
              ) : (
                stats.origins.map((o) => (
                  <TableRow key={o.origin}>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                      {o.origin}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-right">
                      {nf.format(o.sessions)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-right">
                      {nf.format(o.clickSessions)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-right">
                      {o.rate.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Cliques por botão</h3>
          </div>
          <Table>
            <caption className="sr-only">Cliques e sessões por botão de contato</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Botão</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.buttons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                    Nenhum clique no período.
                  </TableCell>
                </TableRow>
              ) : (
                stats.buttons.map((b) => (
                  <TableRow key={b.key}>
                    <TableCell className="text-sm text-gray-600">
                      {CLICK_ORIGIN_LABELS[b.key] || b.key}
                      <span className="block text-xs text-gray-400 font-mono">{b.key}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-right">
                      {nf.format(b.clicks)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 text-right">
                      {nf.format(b.sessions)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
