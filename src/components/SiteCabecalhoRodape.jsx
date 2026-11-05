import { linkComprar, linkAlugar, linkAnuncie, linkVitrine } from '../lib/rota.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import Marca from './Marca.jsx'

// Cabeçalho do site público: "Comprar" e "Alugar" filtram a mesma lista (não trocam de página);
// "Anuncie" é um botão especial, levando à página com o formulário para o proprietário.
export function SiteTopo({ navegar, finalidade = '' }) {
  const ir = (e, destino) => {
    e.preventDefault()
    navegar(destino)
  }
  return (
    <header className="vitrine-topo">
      <a className="marca-link" href={linkVitrine} onClick={(e) => ir(e, linkVitrine)}>
        <Marca grande />
      </a>
      <nav className="vitrine-nav">
        <a href={linkComprar} className={finalidade === 'venda' ? 'ativo' : ''} onClick={(e) => ir(e, linkComprar)}>
          Comprar
        </a>
        <a href={linkAlugar} className={finalidade === 'aluguel' ? 'ativo' : ''} onClick={(e) => ir(e, linkAlugar)}>
          Alugar
        </a>
        <a className="botao-anuncie" href={linkAnuncie} onClick={(e) => ir(e, linkAnuncie)}>
          Anuncie
        </a>
      </nav>
    </header>
  )
}

export function SiteRodape() {
  const contato = useContatoSite()
  return (
    <footer className="vitrine-rodape">
      <div className="rodape-identidade">
        {contato?.nome_responsavel && <strong>{contato.nome_responsavel}</strong>}
        {contato?.creci && <span>CRECI {contato.creci}</span>}
        {contato?.email_contato && <span>{contato.email_contato}</span>}
      </div>
    </footer>
  )
}
