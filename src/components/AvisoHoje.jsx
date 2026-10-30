import { useEffect, useRef, useState } from 'react'
import { avisoJaFechado, marcarAvisoFechado } from '../lib/avisos.js'

const SAIDA_MS = 260 // igual à duração da animação de saída no CSS

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Janelinha no canto da tela com o que está marcado para hoje. Aparece uma vez ao entrar, em fade suave,
// não bloqueia nem rouba o foco da tela, e só sai quando o usuário fecha.
export default function AvisoHoje({ usuarioId, hoje, carregado, onVerAgenda }) {
  const [fase, setFase] = useState('fechado') // fechado | aberto | saindo
  const decidiu = useRef(false)
  const timer = useRef(null)

  // decide uma única vez, depois do primeiro carregamento da agenda
  useEffect(() => {
    if (!carregado || decidiu.current) return
    decidiu.current = true
    if (hoje.length > 0 && !avisoJaFechado(usuarioId)) setFase('aberto')
  }, [carregado, hoje.length, usuarioId])

  useEffect(() => () => clearTimeout(timer.current), [])

  function fechar(lembrar = true) {
    if (lembrar) marcarAvisoFechado(usuarioId) // não volta a aparecer ao recarregar a página hoje
    setFase('saindo')
    timer.current = setTimeout(() => setFase('fechado'), SAIDA_MS)
  }

  // se tudo de hoje foi concluído (na Agenda, por exemplo), a janelinha se recolhe sozinha
  useEffect(() => {
    if (fase === 'aberto' && hoje.length === 0) fechar(false)
  }, [fase, hoje.length])

  if (fase === 'fechado') return null

  return (
    <aside className={'aviso-hoje' + (fase === 'saindo' ? ' saindo' : '')} role="status" aria-live="polite" aria-label="Compromissos de hoje">
      <div className="aviso-hoje-topo">
        <span className="aviso-hoje-icone" aria-hidden="true">
          <IconeSino />
        </span>
        <strong>
          Hoje: {hoje.length} {hoje.length === 1 ? 'compromisso' : 'compromissos'}
        </strong>
        <button type="button" className="link" aria-label="Fechar aviso" onClick={() => fechar()}>
          ✕
        </button>
      </div>
      <ul className="aviso-hoje-lista">
        {hoje.map((i) => (
          <li key={i.tipo + i.id}>
            <span className="aviso-hoje-hora">{hora(i.quando)}</span>
            <span className="aviso-hoje-texto">
              <b>{i.lead?.nome ?? 'Lead'}</b>
              <small>
                {i.tipo === 'visita' ? 'Visita' : 'Retorno'}
                {i.imovel?.titulo ? ` · ${i.imovel.titulo}` : ''}
                {i.nota ? ` · ${i.nota}` : ''}
              </small>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="pequeno primario" onClick={onVerAgenda}>
        Ver agenda
      </button>
    </aside>
  )
}

export function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}
