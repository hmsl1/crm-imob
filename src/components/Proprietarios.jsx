import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { linkWhatsapp } from '../lib/format.js'
import { comCodigo } from '../lib/imovel.js'
import {
  formDoProprietario,
  payloadDoProprietario,
  validarProprietario,
  acharPorTelefone,
  contarImoveis,
  imoveisDoProprietario,
  filtrarProprietarios,
} from '../lib/proprietario.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import Topo from './Topo.jsx'

// Cadastro de proprietários: um proprietário, vários imóveis. Nome e telefones editados aqui
// são atualizados pelo banco em todos os imóveis dele.
export default function Proprietarios({ usuario, pagina, onPagina }) {
  const [lista, setLista] = useState([])
  const [imoveis, setImoveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null) // null | 'novo' | proprietário

  const carregar = useCallback(async () => {
    const [p, i] = await Promise.all([
      supabase.from('proprietarios').select('*').order('nome'),
      supabase.from('imoveis').select('id, codigo, titulo, status, proprietario_id'),
    ])
    setCarregando(false)
    const falha = p.error ?? i.error
    setErro(falha ? falha.message : '')
    setLista(p.data ?? [])
    setImoveis(i.data ?? [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const total = useMemo(() => contarImoveis(imoveis), [imoveis])
  const filtrados = useMemo(() => filtrarProprietarios(lista, busca), [lista, busca])

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina}>
        <input className="busca" type="search" placeholder="Buscar por nome, telefone ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="primario" onClick={() => setAberto('novo')}>
          + Novo proprietário
        </button>
      </Topo>

      {erro && <p className="erro faixa">{erro}</p>}

      {carregando ? (
        <div className="centro">Carregando proprietários…</div>
      ) : filtrados.length === 0 ? (
        <div className="vazio-grande">
          <p>{busca ? 'Nenhum proprietário encontrado.' : 'Nenhum proprietário cadastrado ainda. Eles são criados junto com o cadastro do imóvel.'}</p>
        </div>
      ) : (
        <main className="lista-proprietarios">
          <ul>
            {filtrados.map((p) => {
              const n = total[p.id] ?? 0
              return (
                <li key={p.id}>
                  <button type="button" className="linha-proprietario" onClick={() => setAberto(p)}>
                    <strong>{p.nome}</strong>
                    <span className="suave">{[p.telefone1, p.telefone2].filter(Boolean).join(' · ')}</span>
                    <span className="etiqueta">
                      {n} {n === 1 ? 'imóvel' : 'imóveis'}
                    </span>
                  </button>
                  {p.telefone1 && (
                    <a className="btn-whatsapp" href={linkWhatsapp(p.telefone1)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </main>
      )}

      <Suspense fallback={null}>
        {aberto && (
          <ProprietarioModal
            proprietario={aberto === 'novo' ? null : aberto}
            usuario={usuario}
            todos={lista}
            imoveis={aberto === 'novo' ? [] : imoveisDoProprietario(imoveis, aberto.id)}
            onFechar={() => setAberto(null)}
            onSalvo={async () => {
              setAberto(null)
              await carregar()
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

function ProprietarioModal({ proprietario, usuario, todos, imoveis, onFechar, onSalvo }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [form, setForm] = useState(() => formDoProprietario(proprietario))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const editando = Boolean(proprietario)
  const podeApagar = editando && proprietario.owner_id === usuario.id
  const mudar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const igual = acharPorTelefone(todos, [form.telefone1, form.telefone2], proprietario?.id)[0]

  async function salvar(e) {
    e.preventDefault()
    const problema = validarProprietario(form)
    if (problema) return setErro(problema)
    setErro('')
    setSalvando(true)
    const dados = payloadDoProprietario(form)
    const { error } = editando
      ? await supabase.from('proprietarios').update(dados).eq('id', proprietario.id)
      : await supabase.from('proprietarios').insert(dados)
    setSalvando(false)
    if (error) return setErro(error.message)
    fechar(onSalvo)
  }

  async function apagar() {
    const aviso = imoveis.length
      ? `Excluir o proprietário "${proprietario.nome}"? Os ${imoveis.length} imóveis dele continuam cadastrados, só perdem o vínculo.`
      : `Excluir o proprietário "${proprietario.nome}"?`
    if (!window.confirm(aviso)) return
    const { error } = await supabase.from('proprietarios').delete().eq('id', proprietario.id)
    if (error) return setErro(error.message)
    fechar(onSalvo)
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={editando ? 'Editar proprietário' : 'Novo proprietário'} onClick={(e) => e.stopPropagation()} onSubmit={salvar} noValidate>
        <div className="modal-topo">
          <h2>{editando ? 'Proprietário' : 'Novo proprietário'}</h2>
          <button type="button" className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>
        <label>
          Nome *
          <input value={form.nome} onChange={mudar('nome')} autoComplete="off" autoFocus />
        </label>
        <div className="duas">
          <label>
            Telefone 1 *
            <input type="tel" value={form.telefone1} onChange={mudar('telefone1')} />
          </label>
          <label>
            Telefone 2
            <input type="tel" value={form.telefone2} onChange={mudar('telefone2')} />
          </label>
        </div>
        {igual && (
          <p className="dica" role="status">
            Atenção: este telefone já está cadastrado em <strong>{igual.nome}</strong>.
          </p>
        )}
        <label>
          E-mail
          <input type="email" value={form.email} onChange={mudar('email')} />
        </label>
        <label>
          Observações
          <textarea rows={3} value={form.observacoes} onChange={mudar('observacoes')} />
        </label>

        {editando && (
          <section className="secao">
            <h3>Imóveis deste proprietário ({imoveis.length})</h3>
            {imoveis.length === 0 ? (
              <p className="suave">Nenhum imóvel vinculado.</p>
            ) : (
              <ul className="lista-simples">
                {imoveis.map((i) => (
                  <li key={i.id}>{comCodigo(i)}</li>
                ))}
              </ul>
            )}
            {imoveis.length > 1 && <p className="dica">Nome e telefones alterados aqui são atualizados em todos os imóveis dele.</p>}
          </section>
        )}

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div className="acoes">
          {podeApagar && (
            <button type="button" className="perigo" onClick={apagar}>
              Excluir
            </button>
          )}
          <span className="espaco" />
          <button type="button" onClick={() => fechar(onFechar)}>
            Cancelar
          </button>
          <button type="submit" className="primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
