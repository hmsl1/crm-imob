import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ehDono, formaDoFunil, intervaloDoMes, mesDaData, mesVizinho, montarFunil, outroTipoFunil, rotuloDoMes, tipoFunil } from '../lib/dashboard.js'
import Topo from './Topo.jsx'
import { MetasModal } from '../componentesPreguicosos.js'

// Cores do kit de marca, de cima para baixo; "texto" garante contraste legível em cada faixa
const CORES = [
  { fundo: '#243532', texto: '#f4ecdf' },
  { fundo: '#36504C', texto: '#f4ecdf' },
  { fundo: '#75938C', texto: '#17231f' },
  { fundo: '#B47D4B', texto: '#17231f' },
  { fundo: '#9E673C', texto: '#fbf7ef' },
]

export default function Dashboard({ usuario, pagina, onPagina }) {
  const [mes, setMes] = useState(() => mesDaData())
  const [tipo, setTipo] = useState('venda') // venda | aluguel
  const [escopo, setEscopo] = useState('todos') // todos (imobiliária) | meus
  const [contagens, setContagens] = useState(null)
  const [metas, setMetas] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [abrirMetas, setAbrirMetas] = useState(false)
  const pedido = useRef(0)
  const dono = ehDono(usuario.email)

  const carregar = useCallback(async () => {
    const meu = ++pedido.current
    setCarregando(true)
    const { inicio, fim } = intervaloDoMes(mes)
    const [funil, meta] = await Promise.all([
      supabase.rpc('funil_do_periodo', { p_inicio: inicio, p_fim: fim, p_somente_meus: escopo === 'meus', p_tipo: tipo }),
      supabase.from('metas').select('*').eq('mes', mes).eq('tipo', tipo).maybeSingle(),
    ])
    if (meu !== pedido.current) return // uma consulta mais nova já foi pedida
    const falha = funil.error ?? meta.error
    setErro(falha ? 'Não foi possível carregar o dashboard: ' + falha.message + ' (as migrações 008 e 009 foram executadas?)' : '')
    const linha = Array.isArray(funil.data) ? funil.data[0] : funil.data
    setContagens(linha ?? null)
    setMetas(meta.data ?? null)
    setCarregando(false)
  }, [mes, escopo, tipo])

  useEffect(() => {
    carregar()
  }, [carregar])

  const etapas = useMemo(() => montarFunil(contagens, metas), [contagens, metas])
  const forma = useMemo(() => formaDoFunil(etapas.length), [etapas.length])
  const mesAtual = mesDaData()

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina} />
      <main className="dashboard">
        <section className="cartao-metas" aria-labelledby="titulo-metas">
          <div className="metas-topo">
            <h2 id="titulo-metas">
              {/* a setinha troca entre Venda e Locação, cada um com seus próprios números e metas */}
              <button
                className="titulo-troca"
                aria-label={`${tipoFunil(tipo).titulo}. Trocar para ${outroTipoFunil(tipo).titulo}`}
                title={`Trocar para ${outroTipoFunil(tipo).titulo}`}
                onClick={() => setTipo(outroTipoFunil(tipo).id)}
              >
                {tipoFunil(tipo).titulo}
                <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </h2>
            <div className="metas-controles">
              <div className="seletor-mes" role="group" aria-label="Mês">
                <button className="link" aria-label="Mês anterior" onClick={() => setMes((m) => mesVizinho(m, -1))}>‹</button>
                <span aria-live="polite">{rotuloDoMes(mes)}</span>
                <button className="link" aria-label="Próximo mês" onClick={() => setMes((m) => mesVizinho(m, 1))}>›</button>
                {mes !== mesAtual && <button className="link" onClick={() => setMes(mesAtual)}>Hoje</button>}
              </div>
              <div className="visoes" role="group" aria-label="Quem aparece no funil">
                <button className={escopo === 'todos' ? 'ativo' : ''} aria-pressed={escopo === 'todos'} onClick={() => setEscopo('todos')}>Imobiliária</button>
                <button className={escopo === 'meus' ? 'ativo' : ''} aria-pressed={escopo === 'meus'} onClick={() => setEscopo('meus')}>Só meus</button>
              </div>
            </div>
          </div>

          {erro && <p className="erro" role="alert">{erro}</p>}

          <div className={'funil-corpo' + (carregando ? ' carregando' : '')}>
            <ul className="funil-lista">
              {etapas.map((e, i) => (
                <li key={e.id} data-etapa={e.id}>
                  <div className="funil-linha">
                    <span className="funil-rotulo" title={e.ajuda}>{e.rotulo}</span>
                    <span className="funil-numeros" aria-label={`${e.rotulo}: ${e.realizado} realizado de ${e.meta} de meta`}>
                      <strong>{e.realizado}</strong>/{e.meta}
                    </span>
                  </div>
                  <div className="funil-barra" aria-hidden="true">
                    <span style={{ width: `${Math.min(e.pct ?? 0, 100)}%`, background: CORES[i % CORES.length].fundo }} />
                  </div>
                  <span className={'funil-pct' + (e.batida ? ' batida' : '')}>{e.pct === null ? 'Sem meta definida' : `${e.pct}% da meta${e.batida ? ' ✓' : ''}`}</span>
                </li>
              ))}
            </ul>

            <svg className="funil-desenho" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Funil de ${tipoFunil(tipo).rotulo.toLowerCase()}: captações, novos clientes, visitas, propostas e fechamentos`}>
              {forma.map((pts, i) => (
                <polygon key={etapas[i].id} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={CORES[i % CORES.length].fundo} />
              ))}
            </svg>
            {/* números sobre o funil: ficam em HTML para o texto não esticar junto com o desenho */}
            <ol className="funil-valores" aria-hidden="true">
              {etapas.map((e, i) => (
                <li key={e.id} style={{ color: CORES[i % CORES.length].texto }}>
                  <strong>{e.realizado}</strong>
                  <small>{e.rotulo}</small>
                </li>
              ))}
            </ol>
          </div>

          <button className="link-metas" onClick={() => setAbrirMetas(true)}>
            {dono ? 'Defina ou acompanhe as metas da imobiliária' : 'Acompanhe as metas da imobiliária'}
          </button>
        </section>
      </main>

      <Suspense fallback={null}>
        {abrirMetas && (
          <MetasModal
            mes={mes}
            tipo={tipo}
            metas={metas}
            podeEditar={dono}
            onFechar={() => setAbrirMetas(false)}
            onSalvo={(novas) => {
              setMetas(novas)
              setAbrirMetas(false)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
