import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, CalendarDays, Users, MousePointerClick } from 'lucide-react'

export interface VisitStats {
  total: number
  today: number
  unique: number
  clickRate: number
}

interface VisitSummaryCardsProps {
  stats: VisitStats
}

export function VisitSummaryCards({ stats }: VisitSummaryCardsProps) {
  const cards = [
    {
      title: 'Total de Visitações',
      value: stats.total,
      icon: Eye,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Visitações Hoje',
      value: stats.today,
      icon: CalendarDays,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Usuários Únicos',
      value: stats.unique,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Taxa de Cliques',
      value: `${stats.clickRate.toFixed(1)}%`,
      icon: MousePointerClick,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
              <div className={`p-2 rounded-md ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
