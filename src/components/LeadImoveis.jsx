import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { RECURSOS } from '../config.js'
import { TIPOS_IMOVEL, comCodigo } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { STATUS_VISITA, deInputLocal, quandoCurto, validarVisita, montarMensagem } from '../lib/lead.js'
import { abrirWhatsapp } from '../lib/whatsapp.js'
import { imoveisCompativeisComLead, temCriteriosDeBusca } from '../lib/match.js'
import Opcoes from './Opcoes.jsx'
import { useConfirmar } from '../lib/confirmacao.jsx'

const rotuloTipo = (id) => TIPOS_IMOVEL.find((t) => t.id === id)?.rotulo ?? id

// Aba "Imóveis e visitas" do lead: vincular imóveis, agendar visitas e enviar a ficha.
export default function LeadImoveis({ lead, corretor, dados, onMudou, onErro, onCompartilhar }) {
  const { vinculos, visitas, imoveis } = dados
  const [novoVinculo, setNovoVinculo] = useState('')
  const [visita, setVisita] = useState({ imovel_id: '', quando: '', observacoes: '' })
  const confirmar = useConfirmar()

  const livres = imoveis.filter((i) => !vinculos.some((v) => v.id === i.id))
  const imovelDaVisita = (v) => imoveis.find((i) => i.id === v.imovel_id)
  const sugestoes = useMemo(
    () =>
      RECURSOS.matchInteligente
        ? imoveisCompativeisComLead(
            lead,
            imoveis,
            vinculos.map((v) => v.id)
          )
        : [],
    [lead, imoveis, vinculos]
  )

  async function executar(promessa) {
    const { error } = await promessa
    if (error) onErro(error.message)
    else {
      onErro('')
      await onMudou()
    }
    return !error
  }

  async function vincular(imovelId) {
    return executar(supabase.from('lead_imovel').upsert({ lead_id: lead.id, imovel_id: imovelId }, { onConflict: 'lead_id,imovel_id' }))
  }

  async function adicionarVinculo() {
    if (!novoVinculo) return
    if (await vincular(novoVinculo)) setNovoVinculo('')
  }

  const desvincular = (imovelId) =>
    executar(supabase.from('lead_imovel').delete().eq('lead_id', lead.id).eq('imovel_id', imovelId))

  async function agendar(e) {
    e.preventDefault()
    const problema = validarVisita(visita)
    if (problema) return onErro(problema)
    // agendar visita num imóvel também o vincula ao lead
    if (!vinculos.some((v) => v.id === visita.imovel_id)) await vincular(visita.imovel_id)
    const ok = await executar(
      supabase.from('visitas').insert({
        lead_id: lead.id,
        imovel_id: visita.imovel_id,
        quando: deInputLocal(visita.quando),
        observacoes: visita.observacoes.trim() || null,
      })
    )
    if (ok) setVisita({ imovel_id: '', quando: '', observacoes: '' })
  }

  const mudarStatus = (id, status) => executar(supabase.from('visitas').update({ status }).eq('id', id))
  const excluirVisita = async (id) => {
    if (await confirmar({ titulo: 'Excluir visita', mensagem: 'Excluir esta visita?', textoConfirmar: 'Excluir' })) {
      executar(supabase.from('visitas').delete().eq('id', id))
    }
  }

  return (
    <>
      <section className="secao">
        <h3>Imóveis de interesse</h3>
        <ul className="itens">
          {vinculos.map((i) => {
            const precos = precosDoImovel(i).map((p) => `${p.rotulo} ${p.texto}`).join(' · ')
            return (
              <li key={i.id}>
                <div className="item-info">
                  <strong>{comCodigo(i)}</strong>
                  <span className="suave">
                    {[rotuloTipo(i.tipo), i.bairro, precos].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <div className="item-acoes">
                  <button type="button" className="pequeno" onClick={() => onCompartilhar(i)}>
                    Enviar ficha
                  </button>
                  <button
                    type="button"
                    className="pequeno"
                    onClick={() => abrirWhatsapp(lead.telefone, montarMensagem('apresentacao', { lead, imovel: i, corretor }))}
                  >
                    Apresentar
                  </button>
                  <button type="button" className="link pequeno" onClick={() => desvincular(i.id)} aria-label={`Desvincular ${i.titulo}`}>
                    Remover
                  </button>
                </div>
              </li>
            )
          })}
          {vinculos.length === 0 && <li className="vazio">Nenhum imóvel vinculado.</li>}
        </ul>
        <div className="linha-add">
          <select value={novoVinculo} onChange={(e) => setNovoVinculo(e.target.value)} aria-label="Imóvel para vincular">
            <option value="">{livres.length ? 'Escolha um imóvel…' : 'Sem outros imóveis cadastrados'}</option>
            {livres.map((i) => (
              <option key={i.id} value={i.id}>
                {comCodigo(i)}
              </option>
            ))}
          </select>
          <button type="button" disabled={!novoVinculo} onClick={adicionarVinculo}>
            Vincular
          </button>
        </div>

        {RECURSOS.matchInteligente && (
          <div className="match-bloco">
            <div className="match-topo">
              <strong>✨ Sugestões compatíveis com o perfil</strong>
              {!temCriteriosDeBusca(lead) && (
                <span className="suave">Preencha o "Perfil de busca" para ver sugestões automáticas.</span>
              )}
            </div>
            {temCriteriosDeBusca(lead) && sugestoes.length === 0 ? (
              <p className="suave">Nenhum imóvel disponível livre bate exatamente com esse perfil no momento.</p>
            ) : sugestoes.length > 0 ? (
              <ul className="itens">
                {sugestoes.map(({ imovel: i, motivos }) => {
                  const precos = precosDoImovel(i).map((p) => `${p.rotulo} ${p.texto}`).join(' · ')
                  return (
                    <li key={i.id} className="item-match">
                      <div className="item-info">
                        <strong>{comCodigo(i)}</strong>
                        <span className="suave">
                          {[rotuloTipo(i.tipo), i.bairro, precos].filter(Boolean).join(' · ')}
                        </span>
                        <div className="motivos-match">
                          {motivos.map((m) => (
                            <span key={m} className="etiqueta">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="item-acoes">
                        <button type="button" className="pequeno" onClick={() => vincular(i.id)}>
                          Vincular
                        </button>
                        <button
                          type="button"
                          className="pequeno"
                          onClick={() => abrirWhatsapp(lead.telefone, montarMensagem('apresentacao', { lead, imovel: i, corretor }))}
                        >
                          Apresentar
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <section className="secao">
        <h3>Visitas</h3>
        <ul className="itens">
          {visitas.map((v) => (
            <li key={v.id}>
              <div className="item-info">
                <strong>{v.imoveis ? comCodigo(v.imoveis) : 'Imóvel removido'}</strong>
                <span className="suave">
                  {quandoCurto(v.quando)}
                  {v.observacoes ? ` · ${v.observacoes}` : ''}
                </span>
              </div>
              <div className="item-acoes">
                <select
                  className={'status-visita ' + v.status}
                  value={v.status}
                  onChange={(e) => mudarStatus(v.id, e.target.value)}
                  aria-label="Situação da visita"
                >
                  <Opcoes lista={STATUS_VISITA} />
                </select>
                <button
                  type="button"
                  className="pequeno"
                  onClick={() =>
                    abrirWhatsapp(
                      lead.telefone,
                      montarMensagem(v.status === 'agendada' ? 'confirmar_visita' : 'pos_visita', {
                        lead,
                        imovel: imovelDaVisita(v),
                        corretor,
                        visita: v,
                      })
                    )
                  }
                >
                  {v.status === 'agendada' ? 'Confirmar' : 'Pós-visita'}
                </button>
                <button type="button" className="link pequeno" onClick={() => excluirVisita(v.id)} aria-label="Excluir visita">
                  Excluir
                </button>
              </div>
            </li>
          ))}
          {visitas.length === 0 && <li className="vazio">Nenhuma visita agendada.</li>}
        </ul>

        <form className="agendar" onSubmit={agendar}>
          <div className="duas">
            <label>
              Imóvel
              <select value={visita.imovel_id} onChange={(e) => setVisita({ ...visita, imovel_id: e.target.value })}>
                <option value="">Escolha…</option>
                {[...vinculos, ...livres].map((i) => (
                  <option key={i.id} value={i.id}>
                    {comCodigo(i)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data e hora
              <input type="datetime-local" value={visita.quando} onChange={(e) => setVisita({ ...visita, quando: e.target.value })} />
            </label>
          </div>
          <label>
            Observação (opcional)
            <input value={visita.observacoes} onChange={(e) => setVisita({ ...visita, observacoes: e.target.value })} placeholder="Ex.: pegar a chave com o porteiro" />
          </label>
          <div className="acoes">
            <span className="espaco" />
            <button className="primario">Agendar visita</button>
          </div>
        </form>
      </section>
    </>
  )
}
