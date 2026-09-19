import { Building2 } from 'lucide-react'

export default function TenantNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Empresa não encontrada</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          O endereço acessado não está associado a nenhuma empresa cadastrada na plataforma. Por
          favor, verifique a URL digitada ou entre em contato com o suporte.
        </p>
        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          Plataforma de Locação &bull; Multi-Tenant
        </div>
      </div>
    </div>
  )
}
