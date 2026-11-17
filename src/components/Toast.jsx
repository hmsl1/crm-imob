import { useEffect } from 'react'

// Erro flutuante perto de onde a pessoa está (canto da tela), em vez de uma faixa vermelha
// fixa no topo da página — que passa batido quando o erro acontece numa ação lá embaixo
// (mover um card no fim do quadro, por exemplo). Some sozinho depois de um tempo, mas
// também pode ser fechado na hora.
export default function Toast({ mensagem, onFechar, duracaoMs = 7000 }) {
  useEffect(() => {
    if (!mensagem) return
    const t = setTimeout(onFechar, duracaoMs)
    return () => clearTimeout(t)
  }, [mensagem, duracaoMs, onFechar])

  if (!mensagem) return null

  return (
    <div className="toast-erro" role="alert">
      <span>{mensagem}</span>
      <button type="button" aria-label="Fechar aviso" onClick={onFechar}>
        ×
      </button>
    </div>
  )
}
