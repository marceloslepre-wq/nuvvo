import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as PieChartIcon } from 'lucide-react'
import { MODALITY_LABELS } from '@/lib/visit-utils'

export interface ModalityPoint {
  modality: string
  count: number
}

interface VisitModalityChartProps {
  data: ModalityPoint[]
}

const COLORS = [
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(0 84% 60%)',
  'hsl(200 80% 50%)',
]

const chartConfig: ChartConfig = {
  count: { label: 'Visitas' },
}

export function VisitModalityChart({ data }: VisitModalityChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <PieChartIcon className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Distribuição por Modalidade</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <PieChart>
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload || payload.length === 0) return null
                const item = payload[0].payload as ModalityPoint
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
                return (
                  <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
                    <div className="font-medium">
                      {MODALITY_LABELS[item.modality] || item.modality}
                    </div>
                    <div className="text-gray-500">
                      {item.count} visitas ({pct}%)
                    </div>
                  </div>
                )
              }}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="modality"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.modality} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.map((entry, index) => (
            <div key={entry.modality} className="flex items-center gap-2 text-xs">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-600">
                {MODALITY_LABELS[entry.modality] || entry.modality} ({entry.count})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
