import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import LeadModal from './LeadModal.jsx'
import Topo from './Topo.jsx'
import { linkWhatsapp } from '../lib/format.js'

export default function Kanban({ usuario, pagina, onPagina }) {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [arrastando, setArrastando] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)
  const [aberto, setAberto] = useState(null) // null | 'novo' | lead

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
        <button className="primario" onClick={() => setAberto('novo')}>
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
                      onClick={() => setAberto(lead)}
                    >
                      <strong>{lead.nome}</strong>
                      {lead.telefone && <span>{lead.telefone}</span>}
                      <div className="rodape-lead">
                        <span className="etiqueta">{lead.origem}</span>
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
          lead={aberto === 'novo' ? null : aberto}
          onFechar={() => setAberto(null)}
          onSalvo={() => {
            setAberto(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}
