import { linkWhatsapp } from '../lib/format.js'
import { useContatoSite } from '../lib/useContatoSite.js'

// Botão flutuante, fixo no canto da tela, para contato geral (sem imóvel específico).
export default function BotaoWhatsappFlutuante() {
  const contato = useContatoSite()
  if (!contato?.whatsapp) return null
  const link = linkWhatsapp(contato.whatsapp, 'Olá, gostaria de mais informações')

  return (
    <a className="whatsapp-flutuante" href={link} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.23.6 4.32 1.65 6.12L4 29l8.06-1.6a12.9 12.9 0 0 0 3.96.63C22.6 28.03 28 22.63 28 16.02 28 9.4 22.63 3 16.02 3Zm0 23.1c-1.3 0-2.56-.25-3.73-.76l-.27-.12-4.78.95.97-4.66-.13-.28a9.99 9.99 0 0 1-1.55-5.21c0-5.52 4.5-10.02 10.02-10.02s10.02 4.5 10.02 10.02-4.5 10.08-10.02 10.08Zm5.5-7.52c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"
        />
      </svg>
    </a>
  )
}
