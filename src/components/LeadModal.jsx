import { useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import {
  BUSCA_FINALIDADES,
  ORIGENS,
  formDoLead,
  payloadDoLead,
  resumoDoPerfil,
  validarLead,
} from '../lib/lead.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import { useDadosDoLead, useNomeDoCorretor } from '../lib/useDadosDoLead.js'
import Opcoes from './Opcoes.jsx'
import LeadImoveis from './LeadImoveis.jsx'
import LeadContato from './LeadContato.jsx'
import CompartilharFicha from './CompartilharFicha.jsx'

const ABAS = [
  { id: 'dados', rotulo: 'Dados' },
  { id: 'perfil', rotulo: 'Perfil de busca', soSalvo: false },
  { id: 'imoveis', rotulo: 'Imóveis e visitas', soSalvo: true },
  { id: 'contato', rotulo: 'Contato', soSalvo: true },
]

const ETAPAS_OPCOES = ETAPAS
const ORIGENS_OPCOES = ORIGENS.map((o) => ({ id: o.id, rotulo: o.rotulo }))

export default function LeadModal({ lead, usuario, abaInicial = 'dados', onFechar, onSalvo }) {
  const editando = Boolean(lead)
  const [aba, setAba] = useState(abaInicial)
  const [form, setForm] = useState(() => formDoLead(lead))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [compartilhando, setCompartilhando] = useState(null) // imóvel
  const { saindo, fechar } = useFechamentoAnimado()

  const dados = useDadosDoLead(lead?.id)
  const corretor = useNomeDoCorretor(usuario)

  const campo = (nome) => (e) =>
    setForm((f) => ({
      ...f,
      [nome]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  const alternarTipo = (id) =>
    setForm((f) => ({
      ...f,
      busca_tipos: f.busca_tipos.includes(id) ? f.busca_tipos.filter((t) => t !== id) : [...f.busca_tipos, id],
    }))

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const problema = validarLead(form)
    if (problema) {
      setAba(problema.aba)
      return setErro(problema.mensagem)
    }
    setSalvando(true)
    const payload = payloadDoLead(form, lead)

    if (editando) {
      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id)
      setSalvando(false)
      if (error) setErro(error.message)
      else fechar(() => onSalvo())
    } else {
      // lead novo: continua aberto, já na aba de imóveis/visitas, para vincular e agendar
      const { data, error } = await supabase.from('leads').insert(payload).select().single()
      setSalvando(false)
      if (error) setErro(error.message)
      else onSalvo(data, true)
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir o lead "${lead.nome}"? Isso apaga também histórico, lembretes e visitas.`)) return
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) setErro(error.message)
    else fechar(() => onSalvo())
  }

  const resumo = editando ? resumoDoPerfil(lead) : ''
  const emFormulario = aba === 'dados' || aba === 'perfil'
  const erroGeral = erro || dados.erro

  return (
    <>
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal largo" role="dialog" aria-modal="true" aria-label="Lead" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo alto">
          <div>
            <h2>{editando ? lead.nome : 'Novo lead'}</h2>
            {resumo && <div className="subtitulo">{resumo}</div>}
          </div>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="abas" role="tablist">
          {ABAS.map((a) => {
            const bloqueada = a.soSalvo && !editando
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                className={aba === a.id ? 'ativa' : ''}
                disabled={bloqueada}
                title={bloqueada ? 'Salve o lead primeiro' : undefined}
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
              </button>
            )
          })}
        </div>

        {emFormulario ? (
          <form onSubmit={salvar} noValidate>
            {aba === 'dados' && (
              <>
                <label>
                  Nome *
                  <input value={form.nome} onChange={campo('nome')} />
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
                      <Opcoes lista={ETAPAS_OPCOES} />
                    </select>
                  </label>
                  <label>
                    Origem
                    <select value={form.origem} onChange={campo('origem')}>
                      <Opcoes lista={ORIGENS_OPCOES} />
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
              </>
            )}

            {aba === 'perfil' && (
              <>
                <p className="dica">O que o lead procura. Ajuda a lembrar quais imóveis oferecer.</p>
                <div className="duas">
                  <label>
                    Quer
                    <select value={form.busca_finalidade} onChange={campo('busca_finalidade')}>
                      <Opcoes lista={BUSCA_FINALIDADES} vazio="Não informado" />
                    </select>
                  </label>
                  <label>
                    Mínimo de dormitórios
                    <input type="number" min="0" max="20" value={form.busca_quartos} onChange={campo('busca_quartos')} />
                  </label>
                </div>

                <fieldset className="grupo">
                  <legend>Tipo de imóvel</legend>
                  <div className="grade-checks">
                    {TIPOS_IMOVEL.map((t) => (
                      <label key={t.id} className="check">
                        <input type="checkbox" checked={form.busca_tipos.includes(t.id)} onChange={() => alternarTipo(t.id)} />
                        {t.rotulo}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="duas">
                  <label>
                    Bairros
                    <input value={form.busca_bairros} onChange={campo('busca_bairros')} placeholder="Ex.: Centro, Cavaleiros" />
                  </label>
                  <label>
                    Cidade
                    <input value={form.busca_cidade} onChange={campo('busca_cidade')} />
                  </label>
                </div>
                <div className="duas">
                  <label>
                    Valor mínimo (R$)
                    <input type="number" min="0" step="1000" value={form.busca_valor_min} onChange={campo('busca_valor_min')} />
                  </label>
                  <label>
                    Valor máximo (R$)
                    <input type="number" min="0" step="1000" value={form.busca_valor_max} onChange={campo('busca_valor_max')} />
                  </label>
                </div>
              </>
            )}

            {erroGeral && <p className="erro">{erroGeral}</p>}

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
                {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Salvar e continuar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {aba === 'imoveis' && (
              <LeadImoveis
                lead={lead}
                corretor={corretor}
                dados={dados}
                onMudou={dados.recarregar}
                onErro={setErro}
                onCompartilhar={setCompartilhando}
              />
            )}
            {aba === 'contato' && (
              <LeadContato lead={lead} corretor={corretor} dados={dados} onMudou={dados.recarregar} onErro={setErro} />
            )}
            {erroGeral && <p className="erro">{erroGeral}</p>}
            <div className="acoes">
              <span className="espaco" />
              <button type="button" onClick={() => fechar(() => onSalvo())}>
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {compartilhando && (
      <CompartilharFicha imovel={compartilhando} corretor={corretor} lead={lead} onFechar={() => setCompartilhando(null)} />
    )}
    </>
  )
}
