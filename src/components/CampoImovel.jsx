import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { FINALIDADES, temVenda, temAluguel } from '../lib/imovel.js'
import { exibirCampo, marcadosDoGrupo, rascunhoInicial, calcularAtualizacao } from '../lib/imovelCampos.js'
import { linkWhatsapp } from '../lib/format.js'
import Opcoes from './Opcoes.jsx'

// Um campo na tela de detalhes: mostra o valor com um lápis ao lado. Clicando no lápis, só esse
// campo vira editável; ao salvar, só as colunas dele são gravadas.
export default function CampoImovel({ campo, imovel, corretores, editando, somenteLeitura = false, onEditar, onCancelar, onSalvo }) {
  const editor = editando && (
    <EditorCampo campo={campo} imovel={imovel} corretores={corretores} onCancelar={onCancelar} onSalvo={onSalvo} />
  )
  const lapis = !editando && !somenteLeitura && (
    <button type="button" className="lapis" aria-label={`Editar ${campo.rotulo}`} title="Editar este campo" onClick={onEditar}>
      ✎
    </button>
  )

  if (campo.tipo === 'grupo') {
    const marcados = marcadosDoGrupo(campo, imovel)
    return (
      <div className="campo largo">
        <div className="grupo-cabecalho">
          <dt>{campo.rotulo}</dt>
          {lapis}
        </div>
        <dd>
          {editor || (
            <div className="grade-checks">
              {campo.itens.map((item) => {
                const sim = marcados.includes(item.id)
                return (
                  <span key={item.id} className={'item-estado ' + (sim ? 'sim' : 'nao')}>
                    <span aria-hidden="true">{sim ? '✓' : '–'}</span> {item.rotulo}
                    <span className="sr-only">{sim ? ' (sim)' : ' (não)'}</span>
                  </span>
                )
              })}
            </div>
          )}
        </dd>
      </div>
    )
  }

  const texto = exibirCampo(campo, imovel, { corretores })
  const largo = editando || campo.tipo === 'textarea'

  return (
    <div className={'campo' + (largo ? ' largo' : '')}>
      <dt>{campo.rotulo}</dt>
      <dd>
        {editor || (
          <>
            <span className={'valor-campo' + (campo.tipo === 'textarea' ? ' multilinha' : '')}>
              {texto === null ? (
                <em className="nao-informado">Não informado</em>
              ) : campo.tipo === 'telefone' ? (
                <a href={`tel:${texto}`}>{texto}</a>
              ) : (
                texto
              )}
            </span>
            {campo.tipo === 'telefone' && texto !== null && (
              <a className="btn-whatsapp" href={linkWhatsapp(texto)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
            {lapis}
          </>
        )}
      </dd>
    </div>
  )
}

function EditorCampo({ campo, imovel, corretores, onCancelar, onSalvo }) {
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(campo, imovel))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const definir = (chave, valor) => setRascunho((r) => ({ ...r, [chave]: valor }))

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const resultado = calcularAtualizacao(campo, imovel, rascunho)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setSalvando(true)
    const { data, error } = await supabase
      .from('imoveis')
      .update(resultado.parcial)
      .eq('id', imovel.id)
      .select()
      .single()
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    onSalvo(data)
  }

  return (
    <form className="editor-campo" onSubmit={salvar} noValidate>
      <CorpoEditor campo={campo} rascunho={rascunho} definir={definir} corretores={corretores} />
      {erro && <p className="erro">{erro}</p>}
      <div className="acoes-editor">
        <button type="submit" className="primario pequeno" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="pequeno" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function CorpoEditor({ campo, rascunho, definir, corretores }) {
  const chave = campo.chaves[0]
  const valor = rascunho[chave]
  const aoMudar = (e) => definir(chave, e.target.value)
  const rotulo = campo.rotulo

  switch (campo.tipo) {
    case 'texto':
      return <input autoFocus aria-label={rotulo} value={valor} onChange={aoMudar} />
    case 'telefone':
      return <input autoFocus type="tel" aria-label={rotulo} value={valor} onChange={aoMudar} />
    case 'textarea':
      return <textarea autoFocus rows={6} aria-label={rotulo} value={valor} onChange={aoMudar} />
    case 'moeda':
    case 'm2':
      return <input autoFocus type="number" min="0" step="0.01" aria-label={rotulo} value={valor} onChange={aoMudar} />
    case 'qtd':
      return <input autoFocus type="number" min="0" step="1" aria-label={rotulo} value={valor} onChange={aoMudar} />
    case 'select':
      return (
        <select autoFocus aria-label={rotulo} value={valor} onChange={aoMudar}>
          <Opcoes lista={campo.opcoes} vazio={campo.permiteVazio ? 'Não informado' : undefined} />
        </select>
      )
    case 'simnao':
      return (
        <select autoFocus aria-label={rotulo} value={valor} onChange={aoMudar}>
          <option value="">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      )
    case 'bool':
      return (
        <label className="check">
          <input autoFocus type="checkbox" checked={valor} onChange={(e) => definir(chave, e.target.checked)} />
          {rotulo}
        </label>
      )
    case 'corretor':
      return (
        <select autoFocus aria-label={rotulo} value={valor} onChange={aoMudar}>
          <option value="">Sem corretor</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      )
    case 'finalidade':
      return (
        <>
          <label>
            Finalidade
            <select autoFocus value={rascunho.finalidade} onChange={(e) => definir('finalidade', e.target.value)}>
              <Opcoes lista={FINALIDADES} />
            </select>
          </label>
          {temVenda(rascunho.finalidade) && (
            <label>
              Valor de venda (R$) *
              <input type="number" min="0" step="0.01" value={rascunho.valor_venda} onChange={(e) => definir('valor_venda', e.target.value)} />
            </label>
          )}
          {temAluguel(rascunho.finalidade) && (
            <label>
              Valor do aluguel mensal (R$) *
              <input type="number" min="0" step="0.01" value={rascunho.valor_aluguel} onChange={(e) => definir('valor_aluguel', e.target.value)} />
            </label>
          )}
          <p className="dica">O valor que não se aplica à finalidade escolhida é removido ao salvar.</p>
        </>
      )
    case 'condominio':
      return (
        <>
          <label className="check">
            <input autoFocus type="checkbox" checked={rascunho.sem_condominio} onChange={(e) => definir('sem_condominio', e.target.checked)} />
            Imóvel sem condomínio
          </label>
          <label>
            Condomínio (R$/mês)
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={rascunho.sem_condominio}
              value={rascunho.valor_condominio}
              onChange={(e) => definir('valor_condominio', e.target.value)}
            />
          </label>
        </>
      )
    case 'elevador':
      return (
        <>
          <label className="check">
            <input autoFocus type="checkbox" checked={rascunho.elevador} onChange={(e) => definir('elevador', e.target.checked)} />
            Elevador
          </label>
          {rascunho.elevador && (
            <div className="duas">
              <label>
                Nº de andares do prédio
                <input type="number" min="0" step="1" value={rascunho.andares_predio} onChange={(e) => definir('andares_predio', e.target.value)} />
              </label>
              <label>
                Andar do imóvel
                <input type="number" min="0" step="1" value={rascunho.andar_imovel} onChange={(e) => definir('andar_imovel', e.target.value)} />
              </label>
            </div>
          )}
        </>
      )
    case 'grupo':
      return (
        <div className="grade-checks">
          {campo.itens.map((item) => (
            <label key={item.id} className="check">
              <input
                type="checkbox"
                checked={rascunho.selecionados.includes(item.id)}
                onChange={() =>
                  definir(
                    'selecionados',
                    rascunho.selecionados.includes(item.id)
                      ? rascunho.selecionados.filter((id) => id !== item.id)
                      : [...rascunho.selecionados, item.id]
                  )
                }
              />
              {item.rotulo}
            </label>
          ))}
        </div>
      )
    default:
      return null
  }
}
