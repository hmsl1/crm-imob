import { useState } from 'react'
import { ETAPAS } from '../lib/supabase.js'
import { camposDaEtapa, validarEtapa, aoEscolherEtapa } from '../lib/etapa.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import CamposEtapa from './CamposEtapa.jsx'

// Janela que pede os dados obrigatórios ao arrastar/mover um lead para Perdido ou Fechado.
export default function EtapaModal({ lead, status, onConfirmar, onCancelar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [form, setForm] = useState(() => aoEscolherEtapa(camposDaEtapa(lead), status))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const rotulo = ETAPAS.find((e) => e.id === status)?.rotulo ?? status

  async function confirmar(e) {
    e.preventDefault()
    const problema = validarEtapa(status, form)
    if (problema) return setErro(problema)
    setSalvando(true)
    const falha = await onConfirmar(form)
    setSalvando(false)
    if (falha) setErro(falha)
    else fechar(() => {})
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onCancelar)}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={`Mover para ${rotulo}`} onClick={(e) => e.stopPropagation()} onSubmit={confirmar} noValidate>
        <div className="modal-topo">
          <div>
            <h2>Mover para {rotulo}</h2>
            <div className="subtitulo">{lead.nome}</div>
          </div>
          <button type="button" className="link" onClick={() => fechar(onCancelar)} aria-label="Fechar">
            ✕
          </button>
        </div>
        <CamposEtapa status={status} form={form} onMudar={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="acoes">
          <span className="espaco" />
          <button type="button" onClick={() => fechar(onCancelar)}>Cancelar</button>
          <button type="submit" className="primario" disabled={salvando}>
            {salvando ? 'Salvando…' : `Mover para ${rotulo}`}
          </button>
        </div>
      </form>
    </div>
  )
}
