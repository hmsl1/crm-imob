import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { linkImovel, linkVitrine, linkBuscaImoveis } from '../lib/rota.js'
import { chaveBairro } from '../lib/bairros.js'
import { precosDoImovel, linkWhatsapp, telefoneExibicao } from '../lib/format.js'
import { idsDeVideos } from '../lib/videosSite.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import BuscaImoveis from './BuscaImoveis.jsx'
import LayoutPublico from './LayoutPublico.jsx'

const FILTROS_VAZIOS = { busca: '', tipo: '', finalidade: '', cidade: '', bairro: '', condominio: '', valorMin: '', valorMax: '' }
const TAGLINE_PADRAO = 'O imóvel certo, do jeito certo.'

// Página inicial do site público: a "vitrine" propriamente dita — capa, busca, destaques,
// imóveis por bairro e as seções que só aparecem quando o dono preenche o conteúdo (Sobre,
// depoimentos, vídeos e Instagram nunca mostram texto inventado).
export default function Inicio({ navegar }) {
  const [imoveis, setImoveis] = useState([])
  const [bairros, setBairros] = useState([])
  const [depoimentos, setDepoimentos] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const contato = useContatoSite()

  useEffect(() => {
    document.title = 'CRZ Imóveis'
  }, [])

  useEffect(() => {
    let ativo = true
    supabase
      .from('vitrine_imoveis')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => ativo && setImoveis(data ?? []))
    supabase
      .from('vitrine_bairros')
      .select('*')
      .then(({ data }) => ativo && setBairros(data ?? []))
    supabase
      .from('vitrine_depoimentos')
      .select('*')
      .then(({ data }) => ativo && setDepoimentos(data ?? []))
    return () => {
      ativo = false
    }
  }, [])

  const destaques = imoveis.slice(0, 6)
  const videos = idsDeVideos(contato?.videos_site)
  const whatsapp = contato?.whatsapp ?? null
  const linkFalarEquipe = whatsapp ? linkWhatsapp(whatsapp, 'Olá, não encontrei o que eu procurava no site. Pode me ajudar?') : null

  const abas = [
    { id: '', rotulo: 'Todos' },
    { id: 'venda', rotulo: 'Comprar' },
    { id: 'aluguel', rotulo: 'Alugar' },
  ]

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="inicio">
      <section className="hero-inicio" style={contato?.hero_imagem_url ? { backgroundImage: `url(${contato.hero_imagem_url})` } : undefined}>
        <div className="hero-conteudo">
          <h1>{contato?.tagline_site || TAGLINE_PADRAO}</h1>
          <div className="hero-cta">
            <button type="button" className="cta-primario" onClick={() => navegar(linkBuscaImoveis({ finalidade: 'venda' }))}>
              Imóveis à venda
            </button>
            <button type="button" className="cta-secundario" onClick={() => navegar(linkBuscaImoveis({ finalidade: 'aluguel' }))}>
              Alugar
            </button>
            {linkFalarEquipe && (
              <a className="cta-contorno" href={linkFalarEquipe} target="_blank" rel="noreferrer">
                Falar conosco
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="busca-flutuante-wrap">
        <div className="busca-flutuante">
          <div className="busca-abas">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                className={filtros.finalidade === a.id ? 'ativa' : ''}
                onClick={() => setFiltros((f) => ({ ...f, finalidade: a.id }))}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <BuscaImoveis
            imoveis={imoveis}
            valores={filtros}
            aoMudar={(campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))}
            aoBuscar={() => navegar(linkBuscaImoveis(filtros))}
          />
        </div>
      </div>

      {destaques.length > 0 && (
        <section className="secao-vitrine">
          <div className="titulo-secao">
            <h2>Imóveis selecionados</h2>
            <button type="button" className="link" onClick={() => navegar(linkVitrine)}>
              Ver todos os imóveis →
            </button>
          </div>
          <div className="grade-imoveis">
            {destaques.map((i) => {
              const precos = precosDoImovel(i)
              return (
                <article key={i.id} className="imovel" onClick={() => navegar(linkImovel(i.codigo))}>
                  <div className="foto">
                    {i.nome_condominio && <span className="selo-condominio">{i.nome_condominio}</span>}
                    {i.foto_capa ? <img src={i.foto_capa} alt={i.titulo} loading="lazy" decoding="async" /> : <span>Sem foto</span>}
                    {i.total_fotos > 1 && <span className="selo-fotos">{i.total_fotos} fotos</span>}
                  </div>
                  <div className="corpo">
                    <span className="codigo-imovel">{i.codigo}</span>
                    {precos.length === 0 ? (
                      <span className="preco">
                        <small>Consulte o valor</small>
                      </span>
                    ) : (
                      precos.map((p) => (
                        <span className="preco" key={p.id}>
                          {precos.length > 1 && <small>{p.rotulo} </small>}
                          {p.texto}
                        </span>
                      ))
                    )}
                    <strong>{i.titulo}</strong>
                    <span className="detalhes">{[i.bairro, i.cidade].filter(Boolean).join(' · ')}</span>
                    <span className="link ver-detalhes">Ver detalhes →</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {bairros.length > 0 && (
        <section className="secao-vitrine">
          <div className="titulo-secao">
            <h2>Imóveis por bairro</h2>
            <button type="button" className="link" onClick={() => navegar(linkVitrine)}>
              Ver todas as regiões →
            </button>
          </div>
          <div className="grade-bairros">
            {bairros.slice(0, 8).map((b) => (
              <button
                type="button"
                key={b.bairro}
                className="bairro-tile"
                onClick={() => navegar(linkBuscaImoveis({ bairro: chaveBairro(b.bairro) }))}
              >
                {b.foto_capa ? <img src={b.foto_capa} alt={b.bairro} loading="lazy" /> : <span className="sem-foto">Sem foto</span>}
                <span className="bairro-nome">{b.bairro}</span>
                <span className="bairro-total">
                  {b.total} {b.total === 1 ? 'imóvel' : 'imóveis'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="secao-vitrine">
          <h2>Vídeos</h2>
          <div className="grade-videos">
            {videos.map((id) => (
              <iframe
                key={id}
                src={`https://www.youtube.com/embed/${id}`}
                title="Vídeo"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ))}
          </div>
        </section>
      )}

      {depoimentos.length > 0 && (
        <section className="secao-vitrine">
          <h2>O que dizem sobre nós</h2>
          <div className="grade-depoimentos">
            {depoimentos.map((d) => (
              <blockquote key={d.id} className="depoimento">
                <p>“{d.texto}”</p>
                <cite>{d.nome}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {contato?.sobre_empresa && (
        <section className="secao-vitrine secao-sobre">
          <h2>Sobre nós</h2>
          <p className="multilinha">{contato.sobre_empresa}</p>
        </section>
      )}

      {contato?.instagram_handle && (
        <a
          className="faixa-instagram"
          href={`https://instagram.com/${contato.instagram_handle.replace(/^@/, '')}`}
          target="_blank"
          rel="noreferrer"
        >
          Siga @{contato.instagram_handle.replace(/^@/, '')} no Instagram
        </a>
      )}

      <section className="faixa-cta">
        <h2>Não achou o que procurava?</h2>
        <div className="acoes">
          {linkFalarEquipe && (
            <a className="botao-whatsapp-grande" href={linkFalarEquipe} target="_blank" rel="noreferrer">
              Falar com a equipe
            </a>
          )}
          <button type="button" className="primario" onClick={() => navegar(linkVitrine)}>
            Ver todos os imóveis
          </button>
        </div>
      </section>
    </LayoutPublico>
  )
}
