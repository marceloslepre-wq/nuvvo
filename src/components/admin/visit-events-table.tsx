import { useState, useMemo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { VisitLog } from '@/services/visit-logs'
import type { ProductPathInfo } from '@/services/products'
import {
  formatDateTime,
  getLocationString,
  MODALITY_LABELS,
  DEVICE_LABELS,
} from '@/lib/visit-utils'

interface VisitEventsTableProps {
  logs: VisitLog[]
  totalCount?: number
  productMap?: Map<string, ProductPathInfo>
}

const PAGE_SIZE = 10

/**
 * Converte caminhos como `/produto/<id>` para `/produto/<referencia>`,
 * mantendo fallback para o ID original se não houver referência ou se o produto não existir.
 * Retorna também o nome do produto caso exista para enriquecer o tooltip (title).
 */
export function resolveDisplayPath(
  path: string | undefined | null,
  productMap?: Map<string, ProductPathInfo>,
): { displayPath: string; tooltipText: string } {
  if (!path) {
    return { displayPath: '—', tooltipText: '' }
  }

  // Regex para identificar rota /produto/<id>
  // Aceita /produto/<id> com ou sem trailing slash ou query params
  const match = path.match(/^\/produto\/([a-zA-Z0-9_-]+)(\/.*|\?.*)?$/)
  if (!match) {
    return { displayPath: path, tooltipText: path }
  }

  const productId = match[1]
  const remainder = match[2] || ''
  const productInfo = productMap?.get(productId)

  if (!productInfo) {
    // ID que não corresponde a nenhum produto (fallback conforme requisito 3)
    return { displayPath: path, tooltipText: path }
  }

  const ref = productInfo.displayReference?.trim()
  if (!ref) {
    // Produto sem referência cadastrada (fallback conforme requisito 2)
    const tooltip = productInfo.name ? `${productInfo.name} (${path})` : path
    return { displayPath: path, tooltipText: tooltip }
  }

  // Substitui o ID pela referência do produto
  const resolvedPath = `/produto/${ref}${remainder}`
  const tooltip = productInfo.name
    ? `${productInfo.name} — ${resolvedPath} (id: ${productId})`
    : resolvedPath

  return { displayPath: resolvedPath, tooltipText: tooltip }
}

export function VisitEventsTable({ logs, totalCount, productMap }: VisitEventsTableProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const countDisplay = typeof totalCount === 'number' ? totalCount : logs.length
  const formattedCount = new Intl.NumberFormat('pt-BR').format(countDisplay)

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return logs.slice(start, start + PAGE_SIZE)
  }, [logs, currentPage])

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">Log de Eventos</h3>
        <p className="text-xs text-gray-500 mt-0.5">{formattedCount} registros encontrados</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Data</TableHead>
              <TableHead className="w-[90px]">Hora</TableHead>
              <TableHead className="w-[130px]">IP</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead className="w-[110px]">Dispositivo</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Caminho / Rota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                  Nenhum evento registrado no período.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((log) => {
                const { date, time } = formatDateTime(log.created)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-600">{date}</TableCell>
                    <TableCell className="text-sm text-gray-600">{time}</TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {(log as any).ip ? (log as any).ip : 'Desconhecido'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[180px] truncate">
                      {log.source || log.referrer || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          log.type === 'click'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                        }
                      >
                        {log.type === 'click' ? 'Clique' : 'Visita'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {MODALITY_LABELS[log.modality] || log.modality || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {DEVICE_LABELS[log.device] || log.device || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                      {getLocationString(log.country, log.region, log.city)}
                    </TableCell>
                    {(() => {
                      const { displayPath, tooltipText } = resolveDisplayPath(log.path, productMap)
                      return (
                        <TableCell
                          className="text-sm text-gray-600 font-mono max-w-[220px] truncate"
                          title={tooltipText || undefined}
                        >
                          {displayPath}
                        </TableCell>
                      )
                    })()}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between p-4 border-t">
        <span className="text-xs text-gray-500">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
