import { linkInicio, linkVitrine, linkContato } from '../lib/rota.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import Marca from './Marca.jsx'

// Cabeçalho do site público: "Início", "Imóveis" e "Contato" são páginas; o botão "Anuncie seu
// imóvel" abre um pop-up (não navega), por isso chama onAnuncie em vez de usar um link.
export function SiteTopo({ navegar, paginaAtiva = '', onAnuncie }) {
  const ir = (e, destino) => {
    e.preventDefault()
    navegar(destino)
  }
  return (
    <header className="vitrine-topo">
      <a className="marca-link" href={linkInicio} onClick={(e) => ir(e, linkInicio)}>
        <Marca grande />
      </a>
      <nav className="vitrine-nav">
        <a href={linkInicio} className={paginaAtiva === 'inicio' ? 'ativo' : ''} onClick={(e) => ir(e, linkInicio)}>
          Início
        </a>
        <a href={linkVitrine} className={paginaAtiva === 'vitrine' || paginaAtiva === 'imovel' ? 'ativo' : ''} onClick={(e) => ir(e, linkVitrine)}>
          Imóveis
        </a>
        <a href={linkContato} className={paginaAtiva === 'contato' ? 'ativo' : ''} onClick={(e) => ir(e, linkContato)}>
          Contato
        </a>
        <button type="button" className="botao-anuncie" onClick={onAnuncie}>
          Anuncie seu imóvel
        </button>
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
        {contato?.nome_responsavel && <strong>{contato.nome_responsavel}</strong>}
        {contato?.creci && <span>CRECI {contato.creci}</span>}
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
