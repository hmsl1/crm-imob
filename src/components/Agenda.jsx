import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { agendaPorFaixa } from '../lib/agenda.js'
import { STATUS_VISITA, montarMensagem, quandoCurto } from '../lib/lead.js'
import { abrirWhatsapp } from '../lib/whatsapp.js'
import { useNomeDoCorretor } from '../lib/corretor.js'
import Topo from './Topo.jsx'
import LeadModal from './LeadModal.jsx'

const RESULTADOS = STATUS_VISITA.filter((s) => s.id !== 'agendada')

// Tudo o que o corretor precisa fazer: retornos e visitas, agrupados por atrasados / hoje / próximos.
export default function Agenda({ usuario, pagina, onPagina }) {
  const [visitas, setVisitas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null) // { lead, aba }
  const { nome: corretor } = useNomeDoCorretor(usuario)

  const carregar = useCallback(async () => {
    const [v, l] = await Promise.all([
      supabase.from('visitas').select('*, leads(id, nome, telefone), imoveis(id, titulo)').eq('status', 'agendada').order('quando'),
      supabase.from('lembretes').select('*, leads(id, nome, telefone)').eq('concluido', false).order('quando'),
    ])
    const falha = v.error ?? l.error
    setErro(falha ? falha.message : '')
    setVisitas(v.data ?? [])
    setLembretes(l.data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const faixas = useMemo(() => agendaPorFaixa(visitas, lembretes), [visitas, lembretes])

  async function executar(promessa) {
    const { error } = await promessa
    if (error) setErro(error.message)
    else await carregar()
  }

  const concluirLembrete = (id) =>
    executar(supabase.from('lembretes').update({ concluido: true, concluido_em: new Date().toISOString() }).eq('id', id))
  const resultadoVisita = (id, status) => executar(supabase.from('visitas').update({ status }).eq('id', id))

  async function abrirLead(leadId, aba) {
    const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single()
    if (error) setErro(error.message)
    else setAberto({ lead: data, aba })
  }

  function whatsapp(item) {
    const visita = item.tipo === 'visita' ? { quando: item.quando } : null
    const modelo = item.tipo === 'visita' ? 'confirmar_visita' : 'retorno'
    abrirWhatsapp(item.lead.telefone, montarMensagem(modelo, { lead: item.lead, imovel: item.imovel, corretor, visita }))
  }

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina} />
      <main className="agenda">
        {erro && <p className="erro faixa">{erro}</p>}
        {carregando && <div className="centro">Carregando agenda…</div>}
        {!carregando && faixas.length === 0 && (
          <div className="vazio-grande">
            <p>Nada pendente. Crie lembretes de retorno e agende visitas dentro de cada lead.</p>
          </div>
        )}
        {faixas.map((faixa) => (
          <section key={faixa.id} className={'faixa-agenda ' + faixa.id}>
            <h2>
              {faixa.titulo} <span className="contagem">{faixa.itens.length}</span>
            </h2>
            <ul className="itens">
              {faixa.itens.map((item) => (
                <li key={item.tipo + item.id}>
                  <div className="item-info">
                    <span className={'tipo-agenda ' + item.tipo}>{item.tipo === 'visita' ? 'Visita' : 'Retorno'}</span>
                    <button
                      type="button"
                      className="link nome-lead"
                      onClick={() => abrirLead(item.lead.id, item.tipo === 'visita' ? 'imoveis' : 'contato')}
                    >
                      {item.lead.nome ?? 'Lead'}
                    </button>
                    <span className="suave">
                      {quandoCurto(item.quando)}
                      {item.imovel ? ` · ${item.imovel.titulo}` : ''}
                      {item.nota ? ` · ${item.nota}` : ''}
                    </span>
                  </div>
                  <div className="item-acoes">
                    <button type="button" className="pequeno" onClick={() => whatsapp(item)}>
                      WhatsApp
                    </button>
                    {item.tipo === 'lembrete' ? (
                      <button type="button" className="pequeno primario" onClick={() => concluirLembrete(item.id)}>
                        Concluir
                      </button>
                    ) : (
                      <select
                        value=""
                        aria-label="Registrar resultado da visita"
                        onChange={(e) => e.target.value && resultadoVisita(item.id, e.target.value)}
                      >
                        <option value="">Resultado…</option>
                        {RESULTADOS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.rotulo}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {aberto && (
        <LeadModal
          key={aberto.lead.id}
          lead={aberto.lead}
          usuario={usuario}
          abaInicial={aberto.aba}
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
