import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { precosDoImovel, linkWhatsapp } from '../lib/format.js'
import { mensagemInteresse } from '../lib/vitrine.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import { CaracteristicasImovel } from './IconesImovel.jsx'
import { MARCA } from '../config.js'

const INTERVALO_MS = 4500

// Pop-up em tela cheia, no estilo "stories" do Instagram: fundo preto, uma barra de progresso
// por foto (preenchendo sozinha a cada INTERVALO_MS), pausa ao segurar e navegação por toque/clique
// nas laterais. Busca o imóvel (com todas as fotos) só quando abre, porque a listagem não carrega
// a galeria inteira de cada card.
export default function ImovelStories({ codigo, aoFechar, navegar, linkImovel }) {
  const [imovel, setImovel] = useState(undefined) // undefined = carregando, null = não encontrado
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const contato = useContatoSite()
  const whatsapp = contato?.whatsapp ?? null
  const inicioRef = useRef(0)
  const restanteRef = useRef(INTERVALO_MS)

  useEffect(() => {
    let ativo = true
    setImovel(undefined)
    setAtual(0)
    supabase
      .from('vitrine_imovel')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setImovel(data ?? null)
      })
    return () => {
      ativo = false
    }
  }, [codigo])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape') aoFechar()
      if (e.key === 'ArrowRight') irPara(1)
      if (e.key === 'ArrowLeft') irPara(-1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  const fotos = imovel?.fotos ?? []
  const total = fotos.length

  // Avança sozinho; ao terminar a última foto, volta para a primeira (o pop-up continua aberto).
  useEffect(() => {
    if (!imovel || total === 0 || pausado) return
    inicioRef.current = Date.now()
    const t = setTimeout(() => setAtual((a) => (a + 1) % total), restanteRef.current)
    return () => {
      clearTimeout(t)
      restanteRef.current -= Date.now() - inicioRef.current
      if (restanteRef.current <= 0) restanteRef.current = INTERVALO_MS
    }
  }, [imovel, total, atual, pausado])

  useEffect(() => {
    restanteRef.current = INTERVALO_MS
  }, [atual])

  function irPara(delta) {
    if (total === 0) return
    restanteRef.current = INTERVALO_MS
    setAtual((a) => (a + delta + total) % total)
  }

  if (imovel === null) {
    return (
      <div className="stories-fundo" onClick={aoFechar}>
        <div className="stories-vazio" onClick={(e) => e.stopPropagation()}>
          <p>Não foi possível carregar esse imóvel.</p>
          <button type="button" className="primario" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    )
  }

  const precos = imovel ? precosDoImovel(imovel) : []
  const linkWhats = whatsapp ? linkWhatsapp(whatsapp, 'Olá, gostaria de mais informações') : null
  const linkVisita = whatsapp && imovel ? linkWhatsapp(whatsapp, `Olá, gostaria de agendar uma visita no imóvel ${imovel.codigo} (${imovel.titulo}).`) : null
  const linkInteresse = whatsapp && imovel ? linkWhatsapp(whatsapp, mensagemInteresse(imovel)) : null

  return (
    <div className="stories-fundo" role="dialog" aria-modal="true">
      <div className="stories-caixa">
        <div className="stories-barras">
          {(total > 0 ? fotos : [0]).map((_, idx) => (
            <div className="stories-barra" key={idx}>
              <div
                className="stories-barra-preenchida"
                style={
                  idx < atual
                    ? { width: '100%', transition: 'none' }
                    : idx === atual
                      ? { width: '100%', transitionDuration: `${restanteRef.current}ms`, animationPlayState: pausado ? 'paused' : 'running' }
                      : { width: '0%', transition: 'none' }
                }
              />
            </div>
          ))}
        </div>

        <div className="stories-cabecalho">
          <div className="stories-marca">
            {MARCA.logo ? <img src={MARCA.logo} alt="" /> : <span className="stories-marca-sem-logo">{MARCA.nome?.[0] ?? 'C'}</span>}
            <div>
              <strong>{contato?.nome_responsavel || MARCA.nome}</strong>
              {imovel && <span>{[imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <div className="stories-acoes-topo">
            <button type="button" aria-label={pausado ? 'Continuar' : 'Pausar'} onClick={() => setPausado((p) => !p)}>
              {pausado ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7Zm6 0h4v14h-4Z" /></svg>
              )}
            </button>
            <button type="button" aria-label="Fechar" onClick={aoFechar}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.7 2.88 18.3 9.17 12 2.88 5.71 4.3 4.3l6.29 6.29 6.29-6.29Z" /></svg>
            </button>
          </div>
        </div>

        {imovel === undefined ? (
          <div className="stories-carregando">Carregando…</div>
        ) : (
          <>
            <div className="stories-foto">
              {total > 0 ? <img src={fotos[atual]} alt={imovel.titulo} /> : <span className="stories-sem-foto">Sem fotos</span>}
              <button type="button" className="stories-zona stories-zona-esq" aria-label="Foto anterior" onClick={() => irPara(-1)} />
              <button type="button" className="stories-zona stories-zona-dir" aria-label="Próxima foto" onClick={() => irPara(1)} />
            </div>

            <div className="stories-rodape">
              {imovel.nome_condominio && <span className="selo-condominio">{imovel.nome_condominio}</span>}
              <span className="codigo-imovel">{imovel.codigo}</span>
              <strong className="stories-titulo">{imovel.titulo}</strong>
              <CaracteristicasImovel imovel={imovel} />
              {precos.length > 0 && (
                <span className="stories-preco">
                  {precos.map((p) => (
                    <span key={p.id}>{precos.length > 1 && <small>{p.rotulo} </small>}{p.texto}</span>
                  ))}
                </span>
              )}
              <div className="stories-cta">
                {linkWhats && (
                  <a className="stories-botao verde" href={linkWhats} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58ZM12.06 18.4h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.6 6.6 0 1 1 5.6 3.09Z" /></svg>
                    WhatsApp
                  </a>
                )}
                {linkVisita && (
                  <a className="stories-botao branco" href={linkVisita} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2Zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" /></svg>
                    Agendar visita
                  </a>
                )}
                {linkInteresse && (
                  <a className="stories-botao laranja" href={linkInteresse} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.7-4.3-9.3-8.1C.8 10 1.6 6.4 4.6 4.9c2.2-1.1 4.5-.4 5.9 1.2l1.5 1.7 1.5-1.7c1.4-1.6 3.7-2.3 5.9-1.2 3 1.5 3.8 5.1 1.9 8C18.7 16.7 12 21 12 21Z" /></svg>
                    Tenho interesse
                  </a>
                )}
              </div>
              {navegar && linkImovel && (
                <button type="button" className="stories-link-detalhes" onClick={() => { aoFechar(); navegar(linkImovel(imovel.codigo)) }}>
                  Ver página completa do imóvel →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
