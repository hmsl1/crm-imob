import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { RECURSOS } from '../config.js'
import { linkImovel, linkVitrine, linkBuscaImoveis } from '../lib/rota.js'
import { chaveBairro } from '../lib/bairros.js'
import { ehDestaqueSite } from '../lib/imovel.js'
import { precosDoImovel, linkWhatsapp } from '../lib/format.js'
import { idsDeVideos } from '../lib/videosSite.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import { useVitrineImoveis } from '../lib/useVitrineImoveis.js'
import { lerCache, gravarCache } from '../lib/cache.js'
import BuscaImoveis from './BuscaImoveis.jsx'
import LayoutPublico from './LayoutPublico.jsx'
import ImovelStories from './ImovelStories.jsx'
import CardImovel from './CardImovel.jsx'
import { EsqueletoGrade } from './Esqueleto.jsx'

const FILTROS_VAZIOS = {
  busca: '',
  tipo: '',
  finalidade: '',
  cidade: '',
  bairro: '',
  condominio: '',
  valorMin: '',
  valorMax: '',
  quartosMin: '',
  vagasMin: '',
  caracteristicas: [],
  soFavoritos: false,
}
const TAGLINE_PADRAO = 'O imóvel certo, do jeito certo.'
// Banner padrão do topo, usado enquanto não houver uma imagem cadastrada em "hero_imagem_url".
const BANNER_PADRAO = '/banner-hero.jpg'

// Página inicial do site público: capa, busca flutuante, stories de destaques,
// imóveis selecionados (priorizando destaques), imóveis por bairro e seções configuradas pelo dono.
export default function Inicio({ navegar }) {
  const { imoveis, carregando } = useVitrineImoveis()
  const [bairros, setBairros] = useState(() => lerCache('vitrine:bairros') ?? [])
  const [depoimentos, setDepoimentos] = useState(() => lerCache('vitrine:depoimentos') ?? [])
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [storyAberto, setStoryAberto] = useState(null) // código do imóvel aberto no pop-up de stories
  const trilhaRef = useRef(null)
  const contato = useContatoSite()

  useEffect(() => {
    document.title = 'CRZ Imóveis'
  }, [])

  useEffect(() => {
    let ativo = true
    supabase
      .from('vitrine_bairros')
      .select('*')
      .then(({ data }) => {
        if (!ativo || !data) return
        gravarCache('vitrine:bairros', data)
        setBairros(data)
      })
    supabase
      .from('vitrine_depoimentos')
      .select('*')
      .then(({ data }) => {
        if (!ativo || !data) return
        gravarCache('vitrine:depoimentos', data)
        setDepoimentos(data)
      })
    return () => {
      ativo = false
    }
  }, [])

  const destaques = useMemo(() => {
    if (!RECURSOS.destaqueManualCapa) return imoveis.slice(0, 6)
    const marcados = imoveis.filter(ehDestaqueSite)
    const restantes = imoveis.filter((i) => !ehDestaqueSite(i))
    return [...marcados, ...restantes].slice(0, 6)
  }, [imoveis])

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
      <section className="hero-inicio" style={{ backgroundImage: `url(${contato?.hero_imagem_url || BANNER_PADRAO})` }}>
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
        <section className="secao-vitrine secao-destaques">
          <div className="titulo-secao">
            <span className="rotulo-destaques">Destaques</span>
          </div>
          <div className="destaques-trilha-wrap">
            <button type="button" className="destaques-seta esq" aria-label="Voltar" onClick={() => trilhaRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <div className="destaques-trilha" ref={trilhaRef}>
              {destaques.map((i) => {
                const precos = precosDoImovel(i)
                return (
                  <button type="button" key={i.id} className="destaque-item" onClick={() => setStoryAberto(i.codigo)}>
                    <span className="destaque-avatar">
                      {i.foto_capa ? <img src={i.foto_capa} alt={i.titulo} loading="lazy" /> : <span className="sem-foto" />}
                      {precos[0] && <span className="destaque-preco">{precos[0].texto}</span>}
                    </span>
                    <span className="destaque-bairro">{i.bairro || i.titulo}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" className="destaques-seta dir" aria-label="Avançar" onClick={() => trilhaRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </section>
      )}

      {storyAberto && (
        <ImovelStories codigo={storyAberto} navegar={navegar} linkImovel={linkImovel} aoFechar={() => setStoryAberto(null)} />
      )}

      {carregando && imoveis.length === 0 ? (
        <section className="secao-vitrine">
          <div className="titulo-secao">
            <h2>Imóveis selecionados</h2>
          </div>
          <EsqueletoGrade itens={3} />
        </section>
      ) : destaques.length > 0 && (
        <section className="secao-vitrine">
          <div className="titulo-secao">
            <h2>Imóveis selecionados</h2>
            <button type="button" className="link" onClick={() => navegar(linkVitrine)}>
              Ver todos os imóveis →
            </button>
          </div>
          <div className="grade-imoveis">
            {destaques.map((i, idx) => (
              <CardImovel
                key={i.id}
                imovel={i}
                prioridadeFoto={idx < 3}
                onAbrir={(codigo) => navegar(linkImovel(codigo))}
              />
            ))}
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
