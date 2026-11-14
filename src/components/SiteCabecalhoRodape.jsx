import { useEffect, useState } from 'react'
import { linkInicio, linkVitrine, linkContato } from '../lib/rota.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import { linkWhatsapp, telefoneExibicao } from '../lib/format.js'
import { MARCA } from '../config.js'
import Marca from './Marca.jsx'

// Cabeçalho do site público: "Início", "Imóveis" e "Contato" são páginas; o botão "Anuncie seu
// imóvel" abre um pop-up (não navega), por isso chama onAnuncie em vez de usar um link.
export function SiteTopo({ navegar, paginaAtiva = '', onAnuncie }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const contato = useContatoSite()

  useEffect(() => {
    // Limites diferentes pra ligar (28px) e desligar (12px): evita entrar/sair do estado
    // "scrolled" repetidas vezes caso a rolagem fique oscilando bem perto de um único valor.
    const onScroll = () => {
      setScrolled((atual) => (window.scrollY > 28 ? true : window.scrollY < 12 ? false : atual))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const ir = (e, destino) => {
    e.preventDefault()
    setMenuAberto(false)
    navegar(destino)
  }
  return (
    <header className={'vitrine-topo' + (scrolled ? ' scrolled' : '')}>
      <a className="marca-link" href={linkInicio} onClick={(e) => ir(e, linkInicio)}>
        <Marca grande />
      </a>
      <button
        type="button"
        className={'hamburger' + (menuAberto ? ' aberto' : '')}
        onClick={() => setMenuAberto((v) => !v)}
        aria-label="Abrir menu"
      >
        <span />
        <span />
        <span />
      </button>
      <nav className={'vitrine-nav' + (menuAberto ? ' aberto' : '')}>
        <a href={linkInicio} className={paginaAtiva === 'inicio' ? 'ativo' : ''} onClick={(e) => ir(e, linkInicio)}>
          Início
        </a>
        <a href={linkVitrine} className={paginaAtiva === 'vitrine' || paginaAtiva === 'imovel' ? 'ativo' : ''} onClick={(e) => ir(e, linkVitrine)}>
          Imóveis
        </a>
        <a href={linkContato} className={paginaAtiva === 'contato' ? 'ativo' : ''} onClick={(e) => ir(e, linkContato)}>
          Contato
        </a>
        <button type="button" className="botao-anuncie" onClick={() => { setMenuAberto(false); onAnuncie() }}>
          Anuncie seu imóvel
        </button>
        {contato?.whatsapp && (
          <a
            className="pill-whatsapp"
            href={linkWhatsapp(contato.whatsapp, 'Olá, gostaria de mais informações')}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuAberto(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58ZM12.06 18.4h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.6 6.6 0 1 1 5.6 3.09Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.14-.43.05a5.4 5.4 0 0 1-1.58-.98 5.9 5.9 0 0 1-1.1-1.37c-.11-.2 0-.3.1-.4.1-.1.2-.23.3-.35.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.38-.33-.33-.44-.34h-.38c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.65 0 .97.72 1.92.82 2.05.1.13 1.4 2.14 3.39 3 .47.2.84.33 1.13.42.47.15.9.13 1.24.08.38-.06 1.17-.48 1.34-.95.17-.46.17-.86.12-.95-.05-.08-.18-.14-.38-.24Z" />
            </svg>
            {telefoneExibicao(contato.whatsapp)}
          </a>
        )}
      </nav>
    </header>
  )
}

export function SiteRodape() {
  const contato = useContatoSite()
  return (
    <footer className="vitrine-rodape">
      <div className="rodape-topo">
        <Marca />
        <nav className="rodape-nav">
          <a href={linkInicio}>Início</a>
          <a href={linkVitrine}>Imóveis</a>
          <a href={linkContato}>Contato</a>
        </nav>
      </div>
      <div className="rodape-identidade">
        {MARCA.logo && <img src={MARCA.logo} alt="" className="rodape-selo-logo" />}
        {contato?.nome_responsavel && <strong>{contato.nome_responsavel}</strong>}
        {contato?.creci && <span>CRECI-RJ {contato.creci}</span>}
        {contato?.email_contato && <span>{contato.email_contato}</span>}
        {contato?.instagram_handle && (
          <a href={`https://instagram.com/${contato.instagram_handle.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
            @{contato.instagram_handle.replace(/^@/, '')}
          </a>
        )}
      </div>
      <p className="rodape-aviso">Imagens e valores sujeitos a alteração sem aviso prévio.</p>
    </footer>
  )
}
