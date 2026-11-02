import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ETAPAS_FUNIL, formDasMetas, rotuloDoMes, tipoFunil, validarMetas } from '../lib/dashboard.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

// Metas do mês. Só o dono da imobiliária edita; os demais usuários apenas acompanham (campos travados).
export default function MetasModal({ mes, tipo = 'venda', metas, podeEditar, onFechar, onSalvo }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [form, setForm] = useState(() => formDasMetas(metas))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const { valores, erro: invalido } = validarMetas(form)
    if (invalido) return setErro(invalido)
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('metas').upsert({ mes, tipo, ...valores, atualizado_em: new Date().toISOString() }, { onConflict: 'mes,tipo' })
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar as metas: ' + error.message)
    fechar(() => onSalvo({ mes, tipo, ...valores }))
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={`Metas de ${tipoFunil(tipo).rotulo.toLowerCase()} do mês`} onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="modal-topo">
          <div>
            <h2>{podeEditar ? 'Definir metas' : 'Metas da imobiliária'}</h2>
            <div className="subtitulo">{tipoFunil(tipo).rotulo} · {rotuloDoMes(mes)}</div>
          </div>
          <button type="button" className="link" onClick={() => fechar(onFechar)}>Fechar</button>
        </div>
        {!podeEditar && <p className="aviso-metas">Somente o dono da imobiliária pode alterar as metas. Aqui você acompanha os valores definidos.</p>}
        {ETAPAS_FUNIL.map(({ id, rotulo, ajuda }) => (
          <label key={id}>
            {rotulo}
            <input
              inputMode="numeric"
              placeholder="0"
              value={form[id]}
              disabled={!podeEditar}
              onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
            />
            <span className="ajuda-meta">{ajuda}</span>
          </label>
        ))}
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="acoes">
          <span className="espaco" />
          {podeEditar && (
            <button type="submit" className="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar metas'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
