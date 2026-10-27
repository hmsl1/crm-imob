import { useEffect, useState } from 'react'
import { supabase, ETAPAS, ORIGENS } from '../lib/supabase.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

const VAZIO = {
  nome: '',
  telefone: '',
  email: '',
  status: 'novo',
  origem: 'manual',
  observacoes: '',
  valor_fechado: '',
  consentimento_lgpd: false,
}

export default function LeadModal({ lead, onFechar, onSalvo }) {
  const editando = Boolean(lead)
  const [form, setForm] = useState(() =>
    lead
      ? { ...VAZIO, ...lead, valor_fechado: lead.valor_fechado ?? '' }
      : VAZIO
  )
  const [interacoes, setInteracoes] = useState([])
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const { saindo, fechar } = useFechamentoAnimado()

  useEffect(() => {
    if (!editando) return
    supabase
      .from('interacoes')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInteracoes(data ?? []))
  }, [editando, lead])

  const campo = (nome) => (e) =>
    setForm((f) => ({
      ...f,
      [nome]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      origem: form.origem,
      observacoes: form.observacoes || null,
      valor_fechado: form.status === 'fechado' && form.valor_fechado !== '' ? Number(form.valor_fechado) : null,
      consentimento_lgpd: form.consentimento_lgpd,
      consentimento_em: form.consentimento_lgpd
        ? lead?.consentimento_em ?? new Date().toISOString()
        : null,
    }

    const { error } = editando
      ? await supabase.from('leads').update(payload).eq('id', lead.id)
      : await supabase.from('leads').insert(payload)

    setSalvando(false)
    if (error) setErro(error.message)
    else fechar(onSalvo)
  }

  async function adicionarNota() {
    const texto = nota.trim()
    if (!texto) return
    const { data, error } = await supabase
      .from('interacoes')
      .insert({ lead_id: lead.id, tipo: 'nota', texto })
      .select()
      .single()
    if (error) setErro(error.message)
    else {
      setInteracoes((lista) => [data, ...lista])
      setNota('')
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir o lead "${lead.nome}"? Isso apaga também o histórico.`)) return
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) setErro(error.message)
    else fechar(onSalvo)
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{editando ? 'Editar lead' : 'Novo lead'}</h2>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={salvar}>
          <label>
            Nome *
            <input required value={form.nome} onChange={campo('nome')} />
          </label>
          <div className="duas">
            <label>
              Telefone
              <input value={form.telefone} onChange={campo('telefone')} placeholder="(22) 99999-9999" />
            </label>
            <label>
              E-mail
              <input type="email" value={form.email} onChange={campo('email')} />
            </label>
          </div>
          <div className="duas">
            <label>
              Etapa
              <select value={form.status} onChange={campo('status')}>
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Origem
              <select value={form.origem} onChange={campo('origem')}>
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.status === 'fechado' && (
            <label>
              Valor da venda (R$)
              <input type="number" min="0" step="0.01" value={form.valor_fechado} onChange={campo('valor_fechado')} />
            </label>
          )}

          <label>
            Observações
            <textarea rows={3} value={form.observacoes} onChange={campo('observacoes')} />
          </label>

          <label className="check">
            <input type="checkbox" checked={form.consentimento_lgpd} onChange={campo('consentimento_lgpd')} />
            O lead autorizou o contato e o uso dos seus dados (LGPD)
          </label>

          {erro && <p className="erro">{erro}</p>}

          <div className="acoes">
            {editando && (
              <button type="button" className="perigo" onClick={excluir}>
                Excluir
              </button>
            )}
            <span className="espaco" />
            <button type="button" onClick={() => fechar(onFechar)}>
              Cancelar
            </button>
            <button className="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>

        {editando && (
          <section className="historico">
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
        )}
      </div>
    </div>
  )
}
