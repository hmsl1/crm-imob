import { useState } from 'react'
import { salvarNomeDoCorretor } from '../lib/corretor.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

// "Meu perfil": define o nome do corretor desta conta
export default function PerfilModal({ usuario, nomeAtual, onFechar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [nome, setNome] = useState(nomeAtual)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const r = await salvarNomeDoCorretor(usuario, nome)
    setSalvando(false)
    if (r.erro) setErro(r.erro)
    else fechar(onFechar)
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Meu perfil" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Meu perfil</h2>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={salvar} noValidate>
          <label>
            Nome do corretor
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Marcos Almeida" autoFocus />
          </label>
          <p className="dica">É o nome que assina as mensagens de WhatsApp e aparece na ficha dos imóveis.</p>
          <label>
            E-mail de acesso
            <input value={usuario.email} disabled />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <div className="acoes">
            <span className="espaco" />
            <button type="button" onClick={() => fechar(onFechar)}>
              Cancelar
            </button>
            <button className="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
