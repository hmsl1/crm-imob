import { useEffect, useMemo, useRef, useState } from 'react'
import { RECURSOS } from '../config.js'
import {
  TIPOS_IMOVEL,
  FINALIDADES,
  PADROES,
  sufixoIptu,
  ESTADOS_IMOVEL,
  POSICOES,
  POSICOES_SOLAR,
  GRUPOS_CARACTERISTICAS,
  PISOS,
  atendeFinalidade,
  comCodigo,
} from '../lib/imovel.js'
import { precosDoImovel, moeda, linkWhatsapp } from '../lib/format.js'
import { chaveBairro } from '../lib/bairros.js'
import { mensagemInteresse } from '../lib/vitrine.js'
import { linkVitrine, linkImovel } from '../lib/rota.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import { useVitrineImoveis, lerImovelCache, buscarImovelVitrinePorCodigo } from '../lib/useVitrineImoveis.js'
import { useFavoritos } from '../lib/favoritos.js'
import LayoutPublico from './LayoutPublico.jsx'
import CardImovel from './CardImovel.jsx'
import SimuladorFinanciamento from './SimuladorFinanciamento.jsx'
import { EsqueletoGrade } from './Esqueleto.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id
const vazio = (v) => v === null || v === undefined || v === ''

// Página pública de um imóvel: galeria bento + lightbox, 2 colunas com sidebar sticky,
// simulador de financiamento, favoritos e imóveis semelhantes.
export default function VitrineImovel({ codigo, navegar }) {
  const [imovel, setImovel] = useState(() => lerImovelCache(codigo) ?? undefined) // undefined = carregando, null = não encontrado
  const [atual, setAtual] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const contato = useContatoSite()
  const { imoveis: todosImoveis } = useVitrineImoveis()
  const { ehFavorito, alternarFavorito } = useFavoritos()
  const toque = useRef(null)
  const whatsapp = contato?.whatsapp ?? null

  useEffect(() => {
    let ativo = true
    const emCache = lerImovelCache(codigo)
    setImovel(emCache ?? undefined)
    setAtual(0)
    setLightbox(false)
    buscarImovelVitrinePorCodigo(codigo).then((data) => {
      if (ativo) setImovel(data ?? null)
    })
    return () => {
      ativo = false
    }
  }, [codigo])

  useEffect(() => {
    document.title = imovel ? `${imovel.codigo} · ${imovel.titulo} — CRZ Imóveis` : 'CRZ Imóveis'
  }, [imovel])

  const fotos = imovel?.fotos ?? []
  const totalFotos = fotos.length

  // Pré-carrega a próxima e a anterior para passagem instantânea
  useEffect(() => {
    if (totalFotos < 2) return
    const prox = new Image()
    prox.src = fotos[(atual + 1) % totalFotos]
    const ant = new Image()
    ant.src = fotos[(atual - 1 + totalFotos) % totalFotos]
  }, [atual, totalFotos, fotos])

  // Teclado no lightbox e na galeria
  useEffect(() => {
    if (totalFotos === 0) return
    const aoTecla = (e) => {
      if (e.key === 'Escape' && lightbox) setLightbox(false)
      else if (e.key === 'ArrowLeft' && totalFotos > 1) setAtual((f) => (f - 1 + totalFotos) % totalFotos)
      else if (e.key === 'ArrowRight' && totalFotos > 1) setAtual((f) => (f + 1) % totalFotos)
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [lightbox, totalFotos])

  const semelhantes = useMemo(() => {
    if (!RECURSOS.imoveisSemelhantes || !imovel || todosImoveis.length === 0) return []
    const bairroAtual = chaveBairro(imovel.bairro)
    const precoBase = Number(imovel.valor_venda || imovel.valor_aluguel || 0)
    return todosImoveis
      .filter((i) => i.codigo !== imovel.codigo && atendeFinalidade(i.finalidade, imovel.finalidade === 'venda_aluguel' ? '' : imovel.finalidade))
      .map((i) => {
        let pontos = 0
        if (bairroAtual && chaveBairro(i.bairro) === bairroAtual) pontos += 3
        if (i.tipo === imovel.tipo) pontos += 2
        const precoOutro = Number(i.valor_venda || i.valor_aluguel || 0)
        if (precoBase > 0 && precoOutro > 0 && Math.abs(precoOutro - precoBase) / precoBase <= 0.35) pontos += 2
        return { item: i, pontos }
      })
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 3)
      .map((x) => x.item)
  }, [imovel, todosImoveis])

  if (imovel === undefined) {
    return (
      <LayoutPublico navegar={navegar} paginaAtiva="imovel">
        <div className="vitrine-imovel-largo">
          <EsqueletoGrade itens={1} />
        </div>
      </LayoutPublico>
    )
  }

  if (imovel === null) {
    return (
      <LayoutPublico navegar={navegar} paginaAtiva="imovel">
        <div className="vazio-grande">
          <p>Não encontramos o imóvel "{codigo}". Ele pode ter sido vendido/alugado ou o código está incorreto.</p>
          <button className="primario" onClick={() => navegar(linkVitrine)}>
            Ver todos os imóveis
          </button>
        </div>
      </LayoutPublico>
    )
  }

  const precos = precosDoImovel(imovel)
  const linkFalar = whatsapp ? linkWhatsapp(whatsapp, mensagemInteresse(imovel)) : null
  const linkAgendar = whatsapp
    ? linkWhatsapp(whatsapp, `Olá! Gostaria de agendar uma visita ao imóvel ${comCodigo(imovel)}. Quais horários estão disponíveis?`)
    : null
  const salvo = RECURSOS.favoritosVitrine && ehFavorito(imovel.codigo)
  const usarBento = RECURSOS.galeriaBentoImovel

  const totalVagas = (imovel.vagas_cobertas ?? 0) + (imovel.vagas_descobertas ?? 0)

  // Pacote mensal (Aluguel + Condomínio + IPTU mensalizado)
  const condominioMes = !imovel.sem_condominio && !vazio(imovel.valor_condominio) ? Number(imovel.valor_condominio) : 0
  const iptuMes =
    !imovel.sem_iptu && !vazio(imovel.valor_iptu)
      ? imovel.iptu_periodo === 'anual'
        ? Number(imovel.valor_iptu) / 12
        : Number(imovel.valor_iptu)
      : 0
  const pacoteAluguel =
    imovel.valor_aluguel != null && (condominioMes > 0 || iptuMes > 0)
      ? Number(imovel.valor_aluguel) + condominioMes + iptuMes
      : null

  const dados = [
    !vazio(imovel.area_construida) && [`Área construída`, `${Number(imovel.area_construida)} m²`],
    !vazio(imovel.area_terreno) && [`Área do terreno`, `${Number(imovel.area_terreno)} m²`],
    !vazio(imovel.dormitorios) && ['Dormitórios', imovel.dormitorios],
    !vazio(imovel.suites) && ['Suítes', imovel.suites],
    !vazio(imovel.banheiros) && ['Banheiros', imovel.banheiros],
    !vazio(imovel.salas) && ['Salas', imovel.salas],
    (!vazio(imovel.vagas_cobertas) || !vazio(imovel.vagas_descobertas)) && [
      'Vagas',
      [imovel.vagas_cobertas && `${imovel.vagas_cobertas} cobertas`, imovel.vagas_descobertas && `${imovel.vagas_descobertas} descobertas`].filter(Boolean).join(' · ') || '0',
    ],
    imovel.elevador && ['Elevador', 'Sim'],
    !vazio(imovel.estado_imovel) && ['Situação', rotulo(ESTADOS_IMOVEL, imovel.estado_imovel)],
    !vazio(imovel.posicao) && ['Posição', rotulo(POSICOES, imovel.posicao)],
    !vazio(imovel.posicao_solar) && ['Posição solar', rotulo(POSICOES_SOLAR, imovel.posicao_solar)],
    imovel.vista_mar && ['Vista mar', 'Sim'],
    !vazio(imovel.padrao) && ['Padrão', rotulo(PADROES, imovel.padrao)],
    imovel.aceita_financiamento && ['Aceita financiamento', 'Sim'],
    !imovel.sem_condominio && !vazio(imovel.valor_condominio) && ['Condomínio', `${moeda(imovel.valor_condominio)} /mês`],
    !imovel.sem_iptu && !vazio(imovel.valor_iptu) && ['IPTU', moeda(imovel.valor_iptu) + sufixoIptu(imovel.iptu_periodo)],
  ].filter(Boolean)

  const marcados = (lista, coluna) => lista.filter((item) => (imovel[coluna] ?? []).includes(item.id))
  const irFoto = (passo) => setAtual((f) => (f + passo + totalFotos) % totalFotos)

  const aoTocar = (e) => (toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const aoSoltarToque = (e) => {
    const ini = toque.current
    toque.current = null
    if (!ini || totalFotos < 2) return
    const dx = e.changedTouches[0].clientX - ini.x
    const dy = e.changedTouches[0].clientY - ini.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) irFoto(dx < 0 ? 1 : -1)
  }

  async function compartilharLink() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: `${imovel.codigo} · ${imovel.titulo}`, url })
        return
      } catch {
        /* cancelado ou indisponível: segue para cópia */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      /* fallback silencioso */
    }
  }

  const cardSidebar = (
    <aside className="imovel-sidebar">
      <div className="sidebar-precos">
        {precos.length === 0 ? (
          <span className="valor">Consulte o valor</span>
        ) : (
          precos.map((p) => (
            <span className="valor" key={p.id}>
              <small>{p.rotulo}</small>
              {p.texto}
            </span>
          ))
        )}
        <span className="etiqueta">{rotulo(FINALIDADES, imovel.finalidade)}</span>
      </div>

      {(condominioMes > 0 || iptuMes > 0 || pacoteAluguel != null) && (
        <dl className="encargos-lista">
          {!imovel.sem_condominio && !vazio(imovel.valor_condominio) && (
            <div>
              <dt>Condomínio</dt>
              <dd>{moeda(imovel.valor_condominio)} /mês</dd>
            </div>
          )}
          {!imovel.sem_iptu && !vazio(imovel.valor_iptu) && (
            <div>
              <dt>IPTU</dt>
              <dd>{moeda(imovel.valor_iptu) + sufixoIptu(imovel.iptu_periodo)}</dd>
            </div>
          )}
          {pacoteAluguel != null && (
            <div className="pacote-total">
              <dt>Pacote mensal aprox.</dt>
              <dd>{moeda(pacoteAluguel)} /mês</dd>
            </div>
          )}
        </dl>
      )}

      {linkFalar && (
        <a className="botao-whatsapp-grande" href={linkFalar} target="_blank" rel="noreferrer">
          Falar no WhatsApp sobre este imóvel
        </a>
      )}
      {linkAgendar && (
        <a className="botao-secundario-sidebar" href={linkAgendar} target="_blank" rel="noreferrer">
          Agendar visita pelo WhatsApp
        </a>
      )}

      <div className="acoes-sidebar">
        {RECURSOS.favoritosVitrine && (
          <button
            type="button"
            className={'pequeno' + (salvo ? ' fav-ativo' : '')}
            onClick={() => alternarFavorito(imovel.codigo)}
          >
            {salvo ? '♥ Salvo nos favoritos' : '♡ Salvar favorito'}
          </button>
        )}
        <button type="button" className="pequeno" onClick={compartilharLink}>
          {copiado ? '✓ Link copiado!' : 'Compartilhar'}
        </button>
      </div>
    </aside>
  )

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="imovel">
      <div className={usarBento ? 'vitrine-imovel-largo' : 'vitrine-imovel'}>
        <button type="button" className="link voltar" onClick={() => navegar(linkVitrine)}>
          ← Ver todos os imóveis
        </button>

        {totalFotos === 0 ? (
          <div className="galeria-vitrine sem-foto">Sem fotos</div>
        ) : usarBento && totalFotos >= 3 ? (
          <>
            <div className="galeria-bento">
              <button
                type="button"
                className="bento-principal"
                onClick={() => {
                  setAtual(0)
                  setLightbox(true)
                }}
                aria-label="Ampliar foto principal"
              >
                <img src={fotos[0]} alt={imovel.titulo} fetchPriority="high" decoding="async" />
              </button>
              <div className="bento-secundarias">
                {fotos.slice(1, 5).map((url, idx) => (
                  <button
                    type="button"
                    key={url}
                    className="bento-item"
                    onClick={() => {
                      setAtual(idx + 1)
                      setLightbox(true)
                    }}
                    aria-label={`Ampliar foto ${idx + 2}`}
                  >
                    <img src={url} alt={`${imovel.titulo} - foto ${idx + 2}`} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="bento-ver-todas"
                onClick={() => setLightbox(true)}
              >
                Ver todas as {totalFotos} fotos
              </button>
            </div>

            {/* No mobile o mosaico vira slider com swipe e clique para tela cheia */}
            <div className="galeria-vitrine galeria-bento-mobile">
              <div className="galeria-principal" onTouchStart={aoTocar} onTouchEnd={aoSoltarToque}>
                <img
                  src={fotos[atual]}
                  alt={imovel.titulo}
                  fetchPriority="high"
                  onClick={() => setLightbox(true)}
                />
                {totalFotos > 1 && (
                  <>
                    <button type="button" className="seta esq" aria-label="Foto anterior" onClick={() => irFoto(-1)}>‹</button>
                    <button type="button" className="seta dir" aria-label="Próxima foto" onClick={() => irFoto(1)}>›</button>
                    <span className="contador">{atual + 1}/{totalFotos}</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="galeria-vitrine">
            <div className="galeria-principal" onTouchStart={aoTocar} onTouchEnd={aoSoltarToque}>
              <img
                src={fotos[atual]}
                alt={imovel.titulo}
                className="foto-principal"
                fetchPriority="high"
                onClick={() => usarBento && setLightbox(true)}
              />
              {totalFotos > 1 && (
                <>
                  <button type="button" className="seta esq" aria-label="Foto anterior" onClick={() => irFoto(-1)}>‹</button>
                  <button type="button" className="seta dir" aria-label="Próxima foto" onClick={() => irFoto(1)}>›</button>
                  <span className="contador">{atual + 1}/{totalFotos}</span>
                </>
              )}
            </div>
            {totalFotos > 1 && (
              <div className="galeria-miniaturas">
                {fotos.map((url, idx) => (
                  <button type="button" key={url} className={idx === atual ? 'ativa' : ''} aria-label={`Ver foto ${idx + 1}`} onClick={() => setAtual(idx)}>
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={usarBento ? 'imovel-layout-duas-colunas' : 'imovel-coluna-unica'}>
          <div className="imovel-conteudo-principal">
            <div className="cabecalho-imovel">
              <div>
                <span className="codigo-imovel">{imovel.codigo}</span>
                <h1>{imovel.titulo}</h1>
                <p className="suave">
                  {[rotulo(TIPOS_IMOVEL, imovel.tipo), imovel.nome_condominio, imovel.bairro, imovel.cidade].filter(Boolean).join(' · ')}
                </p>
              </div>
              {!usarBento && (
                <div className="precos-vitrine">
                  {precos.length === 0 ? (
                    <span className="valor">Consulte o valor</span>
                  ) : (
                    precos.map((p) => (
                      <span className="valor" key={p.id}>
                        <small>{p.rotulo}</small>
                        {p.texto}
                      </span>
                    ))
                  )}
                  <span className="etiqueta">{rotulo(FINALIDADES, imovel.finalidade)}</span>
                </div>
              )}
            </div>

            {(imovel.dormitorios != null || imovel.banheiros != null || totalVagas > 0 || imovel.area_construida != null) && (
              <div className="resumo-specs-imovel">
                {imovel.area_construida != null && (
                  <div><strong>{Number(imovel.area_construida)} m²</strong><span>Área útil</span></div>
                )}
                {imovel.dormitorios != null && (
                  <div><strong>{imovel.dormitorios}</strong><span>{imovel.dormitorios === 1 ? 'Dormitório' : 'Dormitórios'}</span></div>
                )}
                {imovel.suites > 0 && (
                  <div><strong>{imovel.suites}</strong><span>{imovel.suites === 1 ? 'Suíte' : 'Suítes'}</span></div>
                )}
                {imovel.banheiros != null && (
                  <div><strong>{imovel.banheiros}</strong><span>{imovel.banheiros === 1 ? 'Banheiro' : 'Banheiros'}</span></div>
                )}
                {totalVagas > 0 && (
                  <div><strong>{totalVagas}</strong><span>{totalVagas === 1 ? 'Vaga' : 'Vagas'}</span></div>
                )}
              </div>
            )}

            {!usarBento && linkFalar && (
              <a className="botao-whatsapp-grande" href={linkFalar} target="_blank" rel="noreferrer">
                Falar no WhatsApp sobre este imóvel
              </a>
            )}

            {imovel.comentarios && (
              <section className="secao">
                <h3>Sobre o imóvel</h3>
                <p className="multilinha">{imovel.comentarios}</p>
              </section>
            )}

            {dados.length > 0 && (
              <section className="secao">
                <h3>Detalhes</h3>
                <dl className="dados">
                  {dados.map(([rot, valor]) => (
                    <div className="campo" key={rot}>
                      <dt>{rot}</dt>
                      <dd>{valor}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {GRUPOS_CARACTERISTICAS.map((g) => {
              const itens = marcados(g.itens, 'caracteristicas')
              if (itens.length === 0) return null
              return (
                <section className="secao" key={g.id}>
                  <h3>{g.titulo}</h3>
                  <div className="grade-checks">
                    {itens.map((item) => (
                      <span key={item.id} className="item-estado sim">
                        <span aria-hidden="true">✓</span> {item.rotulo}
                      </span>
                    ))}
                  </div>
                </section>
              )
            })}
            {marcados(PISOS, 'pisos').length > 0 && (
              <section className="secao">
                <h3>Tipo de piso</h3>
                <div className="grade-checks">
                  {marcados(PISOS, 'pisos').map((item) => (
                    <span key={item.id} className="item-estado sim">
                      <span aria-hidden="true">✓</span> {item.rotulo}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {RECURSOS.simuladorCustosImovel && Number(imovel.valor_venda) > 0 && (
              <SimuladorFinanciamento imovel={imovel} whatsapp={whatsapp} />
            )}
          </div>

          {usarBento && cardSidebar}
        </div>

        {semelhantes.length > 0 && (
          <section className="secao-vitrine secao-semelhantes">
            <div className="titulo-secao">
              <h2>Imóveis semelhantes</h2>
              <button type="button" className="link" onClick={() => navegar(linkVitrine)}>
                Ver todos →
              </button>
            </div>
            <div className="grade-imoveis">
              {semelhantes.map((s) => (
                <CardImovel key={s.id} imovel={s} mostrarTipo onAbrir={(cod) => navegar(linkImovel(cod))} />
              ))}
            </div>
          </section>
        )}
      </div>

      {lightbox && totalFotos > 0 && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos em tela cheia"
          onClick={() => setLightbox(false)}
        >
          <div className="lightbox-topo" onClick={(e) => e.stopPropagation()}>
            <span>{atual + 1} / {totalFotos} — {imovel.titulo}</span>
            <button type="button" className="lightbox-fechar" aria-label="Fechar galeria" onClick={() => setLightbox(false)}>
              ✕
            </button>
          </div>

          <div
            className="lightbox-palco"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={aoTocar}
            onTouchEnd={aoSoltarToque}
          >
            {totalFotos > 1 && (
              <button type="button" className="seta esq" aria-label="Foto anterior" onClick={() => irFoto(-1)}>
                ‹
              </button>
            )}
            <img src={fotos[atual]} alt={`${imovel.titulo} — foto ${atual + 1}`} />
            {totalFotos > 1 && (
              <button type="button" className="seta dir" aria-label="Próxima foto" onClick={() => irFoto(1)}>
                ›
              </button>
            )}
          </div>

          {totalFotos > 1 && (
            <div className="lightbox-miniaturas" onClick={(e) => e.stopPropagation()}>
              {fotos.map((url, idx) => (
                <button
                  type="button"
                  key={url}
                  className={idx === atual ? 'ativa' : ''}
                  aria-label={`Ir para foto ${idx + 1}`}
                  onClick={() => setAtual(idx)}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </LayoutPublico>
  )
}
