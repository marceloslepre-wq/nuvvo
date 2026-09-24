import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { openWhatsApp, buildWhatsAppLink } from '@/lib/whatsapp'

interface WhatsAppFloatingButtonProps {
  phone?: string | null
}

export function WhatsAppFloatingButton({ phone }: WhatsAppFloatingButtonProps) {
  if (!phone || !phone.trim()) return null

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    openWhatsApp(phone, undefined, 'floating_button')
  }

  const waUrl = buildWhatsAppLink(phone)

  return (
    <aside
      aria-label="Atendimento via WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center animate-fade-in print:hidden"
    >
      <a
        href={waUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        title="Fale conosco no WhatsApp"
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40"
      >
        <span className="sr-only">Fale conosco no WhatsApp</span>
        {/* Efeito de pulso discreto */}
        <span
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none group-hover:hidden"
          aria-hidden="true"
        />
        <WhatsAppIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white transition-transform duration-300 group-hover:scale-105" />
      </a>
    </aside>
  )
}
