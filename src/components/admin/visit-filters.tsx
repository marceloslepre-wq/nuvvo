import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { MODALITY_LABELS } from '@/lib/visit-utils'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export interface VisitFilterState {
  periodDays: number
  modality: string
  onlyBrazil: boolean
}

interface VisitFiltersProps {
  value: VisitFilterState
  onChange: (value: VisitFilterState) => void
  onApply: () => void
}

const PERIOD_OPTIONS = [
  { label: 'Hoje', value: 1 },
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 },
  { label: 'Todo o período', value: 0 },
]

export function VisitFilters({ value, onChange, onApply }: VisitFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-end">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-gray-500">Período</span>
        <Select
          value={String(value.periodDays)}
          onValueChange={(v) => onChange({ ...value, periodDays: Number(v) })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-gray-500">Modalidade</span>
        <Select value={value.modality} onValueChange={(v) => onChange({ ...value, modality: v })}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Todas as Modalidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Modalidades</SelectItem>
            {Object.entries(MODALITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 py-2 md:py-0 md:mb-2">
        <Checkbox
          id="onlyBrazil"
          checked={value.onlyBrazil}
          onCheckedChange={(checked) => onChange({ ...value, onlyBrazil: checked === true })}
        />
        <Label
          htmlFor="onlyBrazil"
          className="text-xs font-medium text-gray-700 cursor-pointer select-none"
        >
          Somente Brasil
        </Label>
      </div>

      <Button onClick={onApply} className="md:ml-2">
        <Filter className="h-4 w-4 mr-2" />
        Aplicar Filtros
      </Button>
    </div>
  )
}
