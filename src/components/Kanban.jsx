import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import LeadModal from './LeadModal.jsx'
import Topo from './Topo.jsx'
import { linkWhatsapp } from '../lib/format.js'
import { rotuloOrigem, quandoCurto, faixaDoDia } from '../lib/lead.js'
import { proximosPorLead } from '../lib/agenda.js'

export default function Kanban({ usuario, pagina, onPagina }) {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [arrastando, setArrastando] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)
  const [aberto, setAberto] = useState(null) // null | { lead, aba }
  const [proximos, setProximos] = useState({}) // { leadId: { visita, lembrete } }

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

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return leads
    return leads.filter((l) =>
      [l.nome, l.telefone, l.email].some((v) => v && v.toLowerCase().includes(termo))
    )
  }, [leads, busca])

  const porEtapa = useMemo(() => {
    const mapa = Object.fromEntries(ETAPAS.map((e) => [e.id, []]))
    filtrados.forEach((l) => mapa[l.status]?.push(l))
    return mapa
  }, [filtrados])

  async function mover(lead, novoStatus) {
    if (lead.status === novoStatus) return
    const anterior = leads
    // atualização otimista; desfaz se o banco recusar
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: novoStatus } : l)))
    const { error } = await supabase.from('leads').update({ status: novoStatus }).eq('id', lead.id)
    if (error) {
      setLeads(anterior)
      setErro('Não foi possível mover o lead: ' + error.message)
    }
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
          placeholder="Buscar por nome, telefone ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="primario" onClick={() => setAberto({ lead: null, aba: 'dados' })}>
          + Novo lead
        </button>
      </Topo>

      {erro && <p className="erro faixa">{erro}</p>}
      {carregando ? (
        <div className="centro">Carregando leads…</div>
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
                      draggable
                      onDragStart={() => setArrastando(lead.id)}
                      onDragEnd={() => {
                        setArrastando(null)
                        setColunaAlvo(null)
                      }}
                      onClick={() => setAberto({ lead, aba: 'dados' })}
                    >
                      <strong>{lead.nome}</strong>
                      {lead.telefone && <span>{lead.telefone}</span>}
                      <Selos proximo={proximos[lead.id]} />
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

      {aberto && (
        <LeadModal
          key={aberto.lead?.id ?? 'novo'}
          lead={aberto.lead}
          usuario={usuario}
          abaInicial={aberto.aba}
          onFechar={() => setAberto(null)}
          onSalvo={(criado) => {
            carregar()
            // lead recém-criado continua aberto, para vincular imóvel e agendar
            setAberto(criado ? { lead: criado, aba: 'imoveis' } : null)
          }}
        />
      )}
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
