import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  MODELOS_MENSAGEM,
  deInputLocal,
  emDiasAs,
  montarMensagem,
  paraInputLocal,
  quandoCurto,
  validarLembrete,
} from '../lib/lead.js'
import { abrirWhatsapp } from '../lib/whatsapp.js'

const ATALHOS = [
  { rotulo: 'Amanhã', dias: 1 },
  { rotulo: 'Em 3 dias', dias: 3 },
  { rotulo: 'Em 1 semana', dias: 7 },
]

// Aba "Contato": lembretes de retorno, mensagens prontas de WhatsApp e histórico.
export default function LeadContato({ lead, corretor, dados, onMudou, onErro }) {
  const { lembretes, vinculos, visitas, interacoes } = dados
  const [novo, setNovo] = useState({ quando: '', nota: '' })

  // mensagem pronta
  const [modelo, setModelo] = useState('retorno')
  const [imovelId, setImovelId] = useState('')
  const imovel = vinculos.find((i) => i.id === imovelId) ?? null
  const proximaVisita = visitas.find((v) => v.status === 'agendada' && (!imovelId || v.imovel_id === imovelId))
  const [texto, setTexto] = useState('')

  // refaz o texto sempre que escolher outro modelo/imóvel; depois dá para editar à vontade
  useEffect(() => {
    setTexto(montarMensagem(modelo, { lead, imovel, corretor, visita: proximaVisita }))
  }, [modelo, imovelId, corretor, lead.nome])

  // histórico
  const [nota, setNota] = useState('')

  async function executar(promessa) {
    const { error } = await promessa
    if (error) onErro(error.message)
    else {
      onErro('')
      await onMudou()
    }
    return !error
  }

  async function adicionarLembrete(e) {
    e.preventDefault()
    const problema = validarLembrete(novo)
    if (problema) return onErro(problema)
    const ok = await executar(
      supabase.from('lembretes').insert({ lead_id: lead.id, quando: deInputLocal(novo.quando), nota: novo.nota.trim() || null })
    )
    if (ok) setNovo({ quando: '', nota: '' })
  }

  const concluir = (l) =>
    executar(
      supabase
        .from('lembretes')
        .update({ concluido: !l.concluido, concluido_em: l.concluido ? null : new Date().toISOString() })
        .eq('id', l.id)
    )
  const excluir = (id) => executar(supabase.from('lembretes').delete().eq('id', id))

  async function adicionarNota() {
    const t = nota.trim()
    if (!t) return
    if (await executar(supabase.from('interacoes').insert({ lead_id: lead.id, tipo: 'nota', texto: t }))) setNota('')
  }

  const pendentes = lembretes.filter((l) => !l.concluido)
  const feitos = lembretes.filter((l) => l.concluido)
  const agora = Date.now()

  return (
    <>
      <section className="secao">
        <h3>Lembretes de retorno</h3>
        <ul className="itens">
          {pendentes.map((l) => (
            <li key={l.id} className={new Date(l.quando) < agora ? 'atrasado' : ''}>
              <div className="item-info">
                <strong>{quandoCurto(l.quando)}</strong>
                {l.nota && <span className="suave">{l.nota}</span>}
              </div>
              <div className="item-acoes">
                <button type="button" className="pequeno" onClick={() => concluir(l)}>
                  Concluir
                </button>
                <button type="button" className="link pequeno" onClick={() => excluir(l.id)} aria-label="Excluir lembrete">
                  Excluir
                </button>
              </div>
            </li>
          ))}
          {pendentes.length === 0 && <li className="vazio">Nenhum retorno pendente.</li>}
          {feitos.map((l) => (
            <li key={l.id} className="feito">
              <div className="item-info">
                <strong>{quandoCurto(l.quando)}</strong>
                {l.nota && <span className="suave">{l.nota}</span>}
              </div>
              <button type="button" className="link pequeno" onClick={() => concluir(l)}>
                Reabrir
              </button>
            </li>
          ))}
        </ul>

        <form className="agendar" onSubmit={adicionarLembrete}>
          <div className="atalhos">
            {ATALHOS.map((a) => (
              <button
                key={a.dias}
                type="button"
                className="pequeno"
                onClick={() => setNovo({ ...novo, quando: paraInputLocal(emDiasAs(a.dias)) })}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="duas">
            <label>
              Retornar em
              <input type="datetime-local" value={novo.quando} onChange={(e) => setNovo({ ...novo, quando: e.target.value })} />
            </label>
            <label>
              Nota (opcional)
              <input value={novo.nota} onChange={(e) => setNovo({ ...novo, nota: e.target.value })} placeholder="Ex.: perguntar da simulação" />
            </label>
          </div>
          <div className="acoes">
            <span className="espaco" />
            <button className="primario">Criar lembrete</button>
          </div>
        </form>
      </section>

      <section className="secao">
        <h3>Mensagens prontas de WhatsApp</h3>
        <div className="duas">
          <label>
            Modelo
            <select value={modelo} onChange={(e) => setModelo(e.target.value)}>
              {MODELOS_MENSAGEM.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Imóvel
            <select value={imovelId} onChange={(e) => setImovelId(e.target.value)}>
              <option value="">Sem imóvel específico</option>
              {vinculos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.titulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Mensagem (pode editar antes de enviar)
          <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="acoes">
          <span className="espaco" />
          {!lead.telefone && <span className="suave">Lead sem telefone: você escolhe o contato no WhatsApp.</span>}
          <button type="button" className="primario" onClick={() => abrirWhatsapp(lead.telefone, texto)}>
            Abrir no WhatsApp
          </button>
        </div>
      </section>

      <section className="secao historico">
        <h3>Histórico</h3>
        <div className="nova-nota">
          <input
            placeholder="Registrar ligação, conversa, visita…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarNota())}
          />
          <button type="button" onClick={adicionarNota}>
            Adicionar
          </button>
        </div>
        <ul>
          {interacoes.map((i) => (
            <li key={i.id}>
              <time>{new Date(i.created_at).toLocaleString('pt-BR')}</time>
              <span className={'tipo ' + i.tipo}>{i.tipo === 'mudanca_status' ? 'etapa' : i.tipo}</span>
              {i.texto}
            </li>
          ))}
          {interacoes.length === 0 && <li className="vazio">Sem registros ainda.</li>}
        </ul>
      </section>
    </>
  )
}
