import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { RECURSOS } from '../config.js'
import { ehDono, formaDoFunil, intervaloDoMes, mesDaData, mesVizinho, montarFunil, outroTipoFunil, rotuloDoMes, tipoFunil } from '../lib/dashboard.js'
import { moeda } from '../lib/format.js'
import { ORIGENS, statusEsfriando } from '../lib/lead.js'
import { proximosPorLead } from '../lib/agenda.js'
import { useAvisos } from '../lib/avisosContexto.js'
import { lerCache, gravarCache } from '../lib/cache.js'
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
  const chaveFunil = `crm:funil:${mes}:${tipo}:${escopo}`
  const cacheFunil = lerCache(chaveFunil)
  const [contagens, setContagens] = useState(() => cacheFunil?.contagens ?? null)
  const [metas, setMetas] = useState(() => cacheFunil?.metas ?? null)
  const [kpisDados, setKpisDados] = useState(() => lerCache('crm:dashboard-kpis') ?? null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(() => !cacheFunil)
  const [abrirMetas, setAbrirMetas] = useState(false)
  const pedido = useRef(0)
  const dono = ehDono(usuario.email)
  const { avisos } = useAvisos()

  const carregar = useCallback(async () => {
    const meu = ++pedido.current
    if (!lerCache(chaveFunil)) setCarregando(true)
    const { inicio, fim } = intervaloDoMes(mes)
    const promessas = [
      supabase.rpc('funil_do_periodo', { p_inicio: inicio, p_fim: fim, p_somente_meus: escopo === 'meus', p_tipo: tipo }),
      supabase.from('metas').select('*').eq('mes', mes).eq('tipo', tipo).maybeSingle(),
    ]
    if (RECURSOS.kpisDashboard) {
      promessas.push(
        supabase.from('leads').select('id, status, origem, valor_fechado, fechado_tipo, fechado_em, comissao_estimada, responsavel_id, owner_id, updated_at, created_at'),
        supabase.from('imoveis').select('id, status, a_completar, owner_id, captador_id'),
        supabase.from('visitas').select('lead_id, quando, status').eq('status', 'agendada'),
        supabase.from('lembretes').select('lead_id, quando, concluido').eq('concluido', false)
      )
    }
    const [funil, meta, resLeads, resImoveis, resVis, resLem] = await Promise.all(promessas)
    if (meu !== pedido.current) return // uma consulta mais nova já foi pedida
    const falha = funil.error ?? meta.error
    setErro(falha ? 'Não foi possível carregar o dashboard: ' + falha.message + ' (as migrações 008 e 009 foram executadas?)' : '')
    const linha = Array.isArray(funil.data) ? funil.data[0] : funil.data
    const novasContagens = linha ?? null
    const novasMetas = meta.data ?? null
    setContagens(novasContagens)
    setMetas(novasMetas)
    gravarCache(chaveFunil, { contagens: novasContagens, metas: novasMetas })

    if (RECURSOS.kpisDashboard && resLeads && !resLeads.error) {
      const pacote = {
        leads: resLeads.data ?? [],
        imoveis: resImoveis?.data ?? [],
        proximos: proximosPorLead(resVis?.data ?? [], resLem?.data ?? []),
      }
      setKpisDados(pacote)
      gravarCache('crm:dashboard-kpis', pacote)
    }
    setCarregando(false)
  }, [mes, escopo, tipo, chaveFunil])

  useEffect(() => {
    carregar()
  }, [carregar])

  const etapas = useMemo(() => montarFunil(contagens, metas), [contagens, metas])
  const forma = useMemo(() => formaDoFunil(etapas.length), [etapas.length])
  const mesAtual = mesDaData()

  const resumo = useMemo(() => {
    if (!RECURSOS.kpisDashboard || !kpisDados) return null
    const meus = (l) => (l.responsavel_id ?? l.owner_id) === usuario.id
    const leadsScope = escopo === 'meus' ? kpisDados.leads.filter(meus) : kpisDados.leads
    const ativos = leadsScope.filter((l) => ['novo', 'contato', 'visita', 'proposta'].includes(l.status))
    const emProposta = ativos.filter((l) => l.status === 'proposta').length
    const esfriando = ativos.filter((l) => statusEsfriando(l, kpisDados.proximos[l.id]).esfriando).length

    const prefixoMes = mes.slice(0, 7)
    const fechadosMes = leadsScope.filter(
      (l) => l.status === 'fechado' && l.fechado_em?.startsWith(prefixoMes) && (l.fechado_tipo ?? 'venda') === tipo
    )
    const volumeFechado = fechadosMes.reduce((acc, l) => acc + Number(l.valor_fechado ?? 0), 0)
    const comissaoMes = fechadosMes.reduce((acc, l) => acc + Number(l.comissao_estimada ?? 0), 0)

    const disponiveis = kpisDados.imoveis.filter((i) => i.status === 'disponivel').length
    const aCompletar = kpisDados.imoveis.filter((i) => i.a_completar).length

    // Distribuição por origem
    const mapaOrigens = new Map()
    for (const l of leadsScope) {
      const id = l.origem || 'manual'
      const item = mapaOrigens.get(id) ?? { id, total: 0, fechados: 0 }
      item.total += 1
      if (l.status === 'fechado') item.fechados += 1
      mapaOrigens.set(id, item)
    }
    const origens = [...mapaOrigens.values()]
      .sort((a, b) => b.total - a.total)
      .map((o) => ({
        ...o,
        rotulo: ORIGENS.find((x) => x.id === o.id)?.curto ?? o.id,
        pct: leadsScope.length ? Math.round((o.total / leadsScope.length) * 100) : 0,
      }))

    const pendenciasAgenda = (avisos.atrasados?.length ?? 0) + (avisos.hoje?.length ?? 0)
    return {
      ativos: ativos.length,
      emProposta,
      esfriando,
      fechadosMes: fechadosMes.length,
      volumeFechado,
      comissaoMes,
      disponiveis,
      aCompletar,
      pendenciasAgenda,
      origens,
      totalLeads: leadsScope.length,
    }
  }, [kpisDados, escopo, usuario.id, mes, tipo, avisos])

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina} />
      <main className="dashboard">
        {RECURSOS.kpisDashboard && resumo && (
          <section className="grade-kpis" aria-label="Resumo rápido">
            <button type="button" className="kpi-card" onClick={() => onPagina('leads')}>
              <span className="kpi-rotulo">Leads ativos</span>
              <strong className="kpi-valor">{resumo.ativos}</strong>
              <span className="kpi-sub">{resumo.emProposta} em proposta</span>
            </button>

            <div className="kpi-card">
              <span className="kpi-rotulo">Fechamentos ({tipoFunil(tipo).rotulo.toLowerCase()})</span>
              <strong className="kpi-valor">
                {moeda(resumo.volumeFechado)}
                {tipo === 'aluguel' && resumo.volumeFechado > 0 ? <small>/mês</small> : null}
              </strong>
              <span className="kpi-sub">
                {resumo.fechadosMes} {resumo.fechadosMes === 1 ? 'negócio' : 'negócios'} · comissão {moeda(resumo.comissaoMes)}
              </span>
            </div>

            <button type="button" className="kpi-card" onClick={() => onPagina('imoveis')}>
              <span className="kpi-rotulo">Imóveis disponíveis</span>
              <strong className="kpi-valor">{resumo.disponiveis}</strong>
              <span className="kpi-sub">
                {resumo.aCompletar > 0 ? `${resumo.aCompletar} a completar` : 'Estoque atualizado'}
              </span>
            </button>

            <button
              type="button"
              className={'kpi-card' + (resumo.esfriando + resumo.pendenciasAgenda > 0 ? ' alerta' : '')}
              onClick={() => onPagina(resumo.pendenciasAgenda > 0 ? 'agenda' : 'leads')}
            >
              <span className="kpi-rotulo">Atenção hoje</span>
              <strong className="kpi-valor">{resumo.pendenciasAgenda + resumo.esfriando}</strong>
              <span className="kpi-sub">
                {resumo.pendenciasAgenda} na agenda · {resumo.esfriando} esfriando
              </span>
            </button>
          </section>
        )}

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

        {RECURSOS.kpisDashboard && resumo && resumo.origens.length > 0 && (
          <section className="cartao-origens" aria-label="Origem dos leads">
            <div className="origens-topo">
              <h3>Origem dos leads</h3>
              <span className="suave">{resumo.totalLeads} {resumo.totalLeads === 1 ? 'lead no total' : 'leads no total'}</span>
            </div>
            <ul className="lista-origens">
              {resumo.origens.map((o) => (
                <li key={o.id}>
                  <div className="origem-linha">
                    <strong>{o.rotulo}</strong>
                    <span className="suave">
                      {o.total} ({o.pct}%){o.fechados > 0 ? ` · ${o.fechados} ${o.fechados === 1 ? 'fechado' : 'fechados'}` : ''}
                    </span>
                  </div>
                  <div className="funil-barra" aria-hidden="true">
                    <span style={{ width: `${o.pct}%`, background: 'var(--acento)' }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
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
