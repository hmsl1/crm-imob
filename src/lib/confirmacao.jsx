// Confirmação de ações destrutivas (excluir, descartar) no mesmo visual dos outros modais do
// sistema, no lugar do window.confirm() nativo do navegador (cinza, sem estilo, sem jeito de
// cancelar sem querer por engano em touch).
//
// Uso: const confirmar = useConfirmar(); const ok = await confirmar({ mensagem: '...' })
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ConfirmacaoContexto = createContext(null)

export function ConfirmacaoProvider({ children }) {
  const [pedido, setPedido] = useState(null) // { titulo, mensagem, textoConfirmar, textoCancelar, perigo }
  const resolverRef = useRef(null)

  const confirmar = useCallback((opcoes) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setPedido({
        titulo: 'Confirmar',
        textoConfirmar: 'Confirmar',
        textoCancelar: 'Cancelar',
        perigo: true,
        ...opcoes,
      })
    })
  }, [])

  function responder(valor) {
    setPedido(null)
    resolverRef.current?.(valor)
    resolverRef.current = null
  }

  // Esc cancela, igual aos outros modais do sistema.
  useEffect(() => {
    if (!pedido) return
    function aoTeclar(e) {
      if (e.key === 'Escape') responder(false)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [pedido])

  return (
    <ConfirmacaoContexto.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="fundo-modal fundo-confirmacao" onClick={() => responder(false)}>
          <div className="modal confirmacao" role="alertdialog" aria-modal="true" aria-label={pedido.titulo} onClick={(e) => e.stopPropagation()}>
            <h2>{pedido.titulo}</h2>
            <p>{pedido.mensagem}</p>
            <div className="acoes">
              <span className="espaco" />
              <button type="button" autoFocus onClick={() => responder(false)}>
                {pedido.textoCancelar}
              </button>
              <button type="button" className={pedido.perigo ? 'perigo' : 'primario'} onClick={() => responder(true)}>
                {pedido.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmacaoContexto.Provider>
  )
}

export function useConfirmar() {
  const confirmar = useContext(ConfirmacaoContexto)
  if (!confirmar) throw new Error('useConfirmar() precisa estar dentro de <ConfirmacaoProvider>')
  return confirmar
}
