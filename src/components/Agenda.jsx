import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { agendaPorFaixa } from '../lib/agenda.js'
import { STATUS_VISITA, montarMensagem, quandoCurto } from '../lib/lead.js'
import { abrirWhatsapp } from '../lib/whatsapp.js'
import { useNomeDoCorretor } from '../lib/corretor.js'
import { useAvisos } from '../lib/avisosContexto.js'
import { linkWhatsapp } from '../lib/format.js'
import { comCodigo } from '../lib/imovel.js'
import Topo from './Topo.jsx'
import { LeadModal } from '../componentesPreguicosos.js'

const RESULTADOS = STATUS_VISITA.filter((s) => s.id !== 'agendada')

// Tudo o que o corretor precisa fazer: retornos e visitas, agrupados por atrasados / hoje / próximos.
export default function Agenda({ usuario, pagina, onPagina }) {
  const [visitas, setVisitas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null) // { lead, aba }
  const { nome: corretor } = useNomeDoCorretor(usuario)
  const { avisos, recarregar: recarregarAvisos } = useAvisos()
  const exclusividades = avisos.exclusividades ?? []

  const carregar = useCallback(async () => {
    const [v, l] = await Promise.all([
      supabase.from('visitas').select('*, leads!inner(id, nome, telefone), imoveis(id, titulo, codigo)').eq('leads.responsavel_id', usuario.id).eq('status', 'agendada').order('quando'),
      supabase.from('lembretes').select('*, leads!inner(id, nome, telefone)').eq('leads.responsavel_id', usuario.id).eq('concluido', false).order('quando'),
    ])
    const falha = v.error ?? l.error
    setErro(falha ? falha.message : '')
    setVisitas(v.data ?? [])
    setLembretes(l.data ?? [])
    setCarregando(false)
  }, [usuario.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const faixas = useMemo(() => agendaPorFaixa(visitas, lembretes), [visitas, lembretes])

  async function executar(promessa) {
    const { error } = await promessa
    if (error) setErro(error.message)
    else {
      await carregar()
      recarregarAvisos()
    }
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
        {!carregando && faixas.length === 0 && exclusividades.length === 0 && (
          <div className="vazio-grande">
            <p>Nada pendente. Crie lembretes de retorno e agende visitas dentro de cada lead.</p>
          </div>
        )}
        {exclusividades.length > 0 && (
          <section className="faixa-agenda exclusividades" aria-label="Exclusividades vencendo">
            <h2>
              Exclusividades <span className="contagem">{exclusividades.length}</span>
            </h2>
            <ul className="itens">
              {exclusividades.map((a) => (
                <li key={a.imovel.id}>
                  <div className="item-info">
                    <span className={'tipo-agenda exclusividade ' + a.estado}>{a.estado === 'vencida' ? 'Vencida' : 'Vencendo'}</span>
                    <strong className="nome-lead">{comCodigo(a.imovel)}</strong>
                    <span className="suave">{a.texto}</span>
                  </div>
                  <div className="item-acoes">
                    {a.imovel.proprietario_telefone1 && (
                      <a
                        className="btn-whatsapp"
                        href={linkWhatsapp(
                          a.imovel.proprietario_telefone1,
                          `Olá${a.imovel.proprietario_nome ? ', ' + a.imovel.proprietario_nome : ''}! Aqui é ${corretor}. Sobre a exclusividade do seu imóvel (${comCodigo(a.imovel)}): vamos conversar sobre a renovação?`
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp do proprietário
                      </a>
                    )}
                    <button type="button" className="pequeno" onClick={() => onPagina('imoveis')}>
                      Ver imóveis
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
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
                      {item.imovel ? ` · ${comCodigo(item.imovel)}` : ''}
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

      <Suspense fallback={null}>
      {aberto && (
        <LeadModal
          key={aberto.lead.id}
          lead={aberto.lead}
          usuario={usuario}
          abaInicial={aberto.aba}
          onFechar={() => {
            setAberto(null)
            carregar()
            recarregarAvisos()
          }}
          onSalvo={() => {
            setAberto(null)
            carregar()
            recarregarAvisos()
          }}
        />
      )}
      </Suspense>
    </div>
  )
}
