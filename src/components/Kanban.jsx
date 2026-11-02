import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import { LeadModal, EtapaModal } from '../componentesPreguicosos.js'
import { colunasDaEtapa, textoDoMotivo } from '../lib/etapa.js'
import { useResponsaveis } from '../lib/responsaveis.js'
import Topo from './Topo.jsx'
import { linkWhatsapp } from '../lib/format.js'
import { rotuloOrigem, quandoCurto, faixaDoDia } from '../lib/lead.js'
import { proximosPorLead } from '../lib/agenda.js'
import { filtrarLeads } from '../lib/leadLista.js'
import LeadLista from './LeadLista.jsx'
import { useAvisos } from '../lib/avisosContexto.js'

const CHAVE_VISAO = 'crm:visao-leads'
const lerVisao = () => {
  try {
    return localStorage.getItem(CHAVE_VISAO) === 'lista' ? 'lista' : 'quadro'
  } catch {
    return 'quadro'
  }
}

export default function Kanban({ usuario, pagina, onPagina }) {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState(lerVisao) // 'quadro' | 'lista'
  // arrastar e soltar só funciona com mouse; no toque cada card tem o seletor "Mover para"
  const [podeArrastar] = useState(() => !globalThis.matchMedia || globalThis.matchMedia('(pointer: fine)').matches)
  const [arrastando, setArrastando] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)
  const [aberto, setAberto] = useState(null) // null | { lead, aba }
  const [etapaPendente, setEtapaPendente] = useState(null) // { lead, status }: pede motivo (Perdido) ou dados do fechamento
  const [escopo, setEscopo] = useState('meus') // meus | todos (leads de outros que o usuário pode ver)
  const { nomeDe } = useResponsaveis()
  const [proximos, setProximos] = useState({}) // { leadId: { visita, lembrete } }
  const { recarregar: recarregarAvisos } = useAvisos() // lembretes/visitas criados na janela do lead atualizam o selo da Agenda

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else {
      setErro('')
      setLeads(data)
    }
    // selos de "retorno" e "visita" dos cards (se a migração 004 ainda não rodou, só não mostra os selos)
    const [vis, lem] = await Promise.all([
      supabase.from('visitas').select('lead_id, quando, status').eq('status', 'agendada'),
      supabase.from('lembretes').select('lead_id, quando, concluido').eq('concluido', false),
    ])
    setProximos(proximosPorLead(vis.data ?? [], lem.data ?? []))
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // digitar na busca não trava no celular: a lista filtra logo depois, sem segurar o teclado
  const buscaAdiada = useDeferredValue(busca)
  const meu = (l) => (l.responsavel_id ?? l.owner_id) === usuario.id
  const temDeOutros = useMemo(() => leads.some((l) => (l.responsavel_id ?? l.owner_id) !== usuario.id), [leads, usuario.id])
  const visiveis = useMemo(() => (escopo === 'todos' ? leads : leads.filter((l) => (l.responsavel_id ?? l.owner_id) === usuario.id)), [leads, escopo, usuario.id])
  const filtrados = useMemo(() => filtrarLeads(visiveis, { busca: buscaAdiada }), [visiveis, buscaAdiada])

  function mudarVisao(nova) {
    setVisao(nova)
    try {
      localStorage.setItem(CHAVE_VISAO, nova)
    } catch {
      /* sem armazenamento: só não lembra a escolha */
    }
  }

  const porEtapa = useMemo(() => {
    const mapa = Object.fromEntries(ETAPAS.map((e) => [e.id, []]))
    filtrados.forEach((l) => mapa[l.status]?.push(l))
    return mapa
  }, [filtrados])

  async function gravarEtapa(lead, novoStatus, formEtapa = {}) {
    const colunas = { status: novoStatus, ...colunasDaEtapa(novoStatus, formEtapa) }
    const anterior = leads
    // atualização otimista; desfaz se o banco recusar
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, ...colunas } : l)))
    const { error } = await supabase.from('leads').update(colunas).eq('id', lead.id)
    if (error) {
      setLeads(anterior)
      return error.message
    }
    return null
  }

  async function mover(lead, novoStatus) {
    if (lead.status === novoStatus) return
    // Perdido e Fechado pedem dados obrigatórios antes de mover
    if (novoStatus === 'perdido' || novoStatus === 'fechado') return setEtapaPendente({ lead, status: novoStatus })
    const falha = await gravarEtapa(lead, novoStatus)
    if (falha) setErro('Não foi possível mover o lead: ' + falha)
  }

  function aoSoltar(e, etapaId) {
    e.preventDefault()
    const lead = leads.find((l) => l.id === arrastando)
    setArrastando(null)
    setColunaAlvo(null)
    if (lead) mover(lead, etapaId)
  }

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina}>
        <input
          className="busca"
          type="search"
          placeholder="Buscar nome, telefone…"
          title="Busca por nome, telefone, e-mail ou observações"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {temDeOutros && (
          <div className="visoes" role="group" aria-label="Quais leads mostrar">
            <button type="button" className={escopo === 'meus' ? 'ativo' : ''} aria-pressed={escopo === 'meus'} onClick={() => setEscopo('meus')}>
              Meus leads
            </button>
            <button type="button" className={escopo === 'todos' ? 'ativo' : ''} aria-pressed={escopo === 'todos'} onClick={() => setEscopo('todos')}>
              Todos
            </button>
          </div>
        )}
        <div className="visoes" role="group" aria-label="Forma de exibição">
          <button type="button" className={visao === 'quadro' ? 'ativo' : ''} aria-pressed={visao === 'quadro'} onClick={() => mudarVisao('quadro')}>
            Quadro
          </button>
          <button type="button" className={visao === 'lista' ? 'ativo' : ''} aria-pressed={visao === 'lista'} onClick={() => mudarVisao('lista')}>
            Lista
          </button>
        </div>
        <button className="primario" onClick={() => setAberto({ lead: null, aba: 'dados' })}>
          + Novo lead
        </button>
      </Topo>

      {erro && <p className="erro faixa">{erro}</p>}
      {carregando ? (
        <div className="centro">Carregando leads…</div>
      ) : visao === 'lista' ? (
        <LeadLista leads={visiveis} busca={buscaAdiada} onAbrir={(lead) => setAberto({ lead, aba: 'dados' })} />
      ) : (
        <main className="quadro">
          {ETAPAS.map((etapa) => {
            const itens = porEtapa[etapa.id]
            return (
              <section
                key={etapa.id}
                className={'coluna' + (colunaAlvo === etapa.id ? ' alvo' : '')}
                onDragOver={(e) => {
                  e.preventDefault()
                  setColunaAlvo(etapa.id)
                }}
                onDragLeave={() => setColunaAlvo((c) => (c === etapa.id ? null : c))}
                onDrop={(e) => aoSoltar(e, etapa.id)}
              >
                <h2>
                  {etapa.rotulo} <span className="contagem">{itens.length}</span>
                </h2>
                <div className="cartoes">
                  {itens.map((lead) => (
                    <article
                      key={lead.id}
                      className={'lead' + (arrastando === lead.id ? ' arrastando' : '')}
                      draggable={podeArrastar}
                      onDragStart={() => setArrastando(lead.id)}
                      onDragEnd={() => {
                        setArrastando(null)
                        setColunaAlvo(null)
                      }}
                      onClick={() => setAberto({ lead, aba: 'dados' })}
                    >
                      <strong>{lead.nome}</strong>
                      {lead.telefone && <span>{lead.telefone}</span>}
                      {lead.status === 'perdido' && lead.perdido_motivo && <span className="motivo-perda">{textoDoMotivo(lead)}</span>}
                      {!meu(lead) && <span className="responsavel-card">Responsável: {nomeDe(lead.responsavel_id ?? lead.owner_id) || '—'}</span>}
                      <Selos proximo={proximos[lead.id]} />
                      <select
                        className="mover-etapa"
                        aria-label={`Mover ${lead.nome} para outra etapa`}
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => mover(lead, e.target.value)}
                      >
                        {ETAPAS.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.id === lead.status ? `Etapa: ${e.rotulo}` : `Mover para ${e.rotulo}`}
                          </option>
                        ))}
                      </select>
                      <div className="rodape-lead">
                        <span className="etiqueta">{rotuloOrigem(lead.origem)}</span>
                        {lead.telefone && (
                          <a
                            className="btn-whatsapp"
                            href={linkWhatsapp(lead.telefone)}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir conversa no WhatsApp"
                            draggable={false}
                            onClick={(e) => e.stopPropagation()}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                  {itens.length === 0 && <p className="vazio">Nenhum lead</p>}
                </div>
              </section>
            )
          })}
        </main>
      )}

      <Suspense fallback={null}>
      {aberto && (
        <LeadModal
          key={aberto.lead?.id ?? 'novo'}
          lead={aberto.lead}
          usuario={usuario}
          abaInicial={aberto.aba}
          onFechar={() => {
            setAberto(null)
            recarregarAvisos()
          }}
          onAbrirOutro={(outro) => setAberto({ lead: outro, aba: 'dados' })}
          onSalvo={(criado) => {
            carregar()
            recarregarAvisos()
            // lead recém-criado continua aberto, para vincular imóvel e agendar
            setAberto(criado ? { lead: criado, aba: 'imoveis' } : null)
          }}
        />
      )}
      {etapaPendente && (
        <EtapaModal
          lead={etapaPendente.lead}
          status={etapaPendente.status}
          onCancelar={() => setEtapaPendente(null)}
          onConfirmar={async (formEtapa) => {
            const falha = await gravarEtapa(etapaPendente.lead, etapaPendente.status, formEtapa)
            if (!falha) {
              setEtapaPendente(null)
              recarregarAvisos()
            }
            return falha
          }}
        />
      )}
      </Suspense>
    </div>
  )
}

// Selos do card: retorno (vermelho se atrasado) e próxima visita
function Selos({ proximo }) {
  if (!proximo) return null
  const atrasado = proximo.lembrete && faixaDoDia(proximo.lembrete) === 'atrasados'
  return (
    <div className="selos-lead">
      {proximo.lembrete && (
        <span className={'selo-lead' + (atrasado ? ' atrasado' : '')}>Retorno {quandoCurto(proximo.lembrete)}</span>
      )}
      {proximo.visita && <span className="selo-lead visita">Visita {quandoCurto(proximo.visita)}</span>}
    </div>
  )
}
