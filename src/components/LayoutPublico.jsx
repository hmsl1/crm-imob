import { useState } from 'react'
import { SiteTopo, SiteRodape } from './SiteCabecalhoRodape.jsx'
import AnuncieModal from './AnuncieModal.jsx'
import BotaoWhatsappFlutuante from './BotaoWhatsappFlutuante.jsx'

// Moldura comum das páginas públicas: cabeçalho, rodapé, botão flutuante de WhatsApp e o
// pop-up "Anuncie seu imóvel" (fica fechado até o visitante clicar no botão do cabeçalho).
export default function LayoutPublico({ navegar, paginaAtiva = '', children }) {
  const [anuncieAberto, setAnuncieAberto] = useState(false)
  return (
    <div className="vitrine">
      <SiteTopo navegar={navegar} paginaAtiva={paginaAtiva} onAnuncie={() => setAnuncieAberto(true)} />
      {children}
      <SiteRodape />
      <BotaoWhatsappFlutuante />
      {anuncieAberto && <AnuncieModal onFechar={() => setAnuncieAberto(false)} />}
    </div>
  )
}
