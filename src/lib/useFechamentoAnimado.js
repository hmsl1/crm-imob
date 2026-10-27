import { useCallback, useEffect, useRef, useState } from 'react'

export const DURACAO_SAIDA_MS = 180 // mantenha igual à duração das animações "sai" no styles.css

// Dá tempo de a animação de saída terminar antes de a janela ser removida.
// Uso: const { saindo, fechar } = useFechamentoAnimado()
//      <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
export function useFechamentoAnimado() {
  const [saindo, setSaindo] = useState(false)
  const ocupado = useRef(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const fechar = useCallback((depois) => {
    if (ocupado.current) return
    ocupado.current = true
    setSaindo(true)
    const reduzMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(depois, reduzMovimento ? 0 : DURACAO_SAIDA_MS)
  }, [])

  return { saindo, fechar }
}
