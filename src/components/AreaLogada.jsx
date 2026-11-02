import { Suspense, useEffect, useMemo, useRef } from 'react'
import Kanban from './Kanban.jsx'
import Dashboard from './Dashboard.jsx'
import { Imoveis, Agenda, precarregarRestante } from '../componentesPreguicosos.js'
import AvisoHoje from './AvisoHoje.jsx'
import { AvisosContexto } from '../lib/avisosContexto.js'
import { useAvisosAgenda } from '../lib/useAvisosAgenda.js'

// Tudo o que aparece depois do login: a página atual, o selo de avisos no menu e a janelinha de hoje.
export default function AreaLogada({ usuario, pagina, saindoPagina, onPagina }) {
  const { avisos, carregado, recarregar } = useAvisosAgenda(usuario.id)
  const valor = useMemo(() => ({ avisos, recarregar }), [avisos, recarregar])

  // ao trocar de página, confere de novo a agenda (algo pode ter sido criado ou concluído)
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) primeira.current = false
    else recarregar()
  }, [pagina, recarregar])

  useEffect(() => precarregarRestante(), [])

  const props = { usuario, pagina, onPagina }
  return (
    <AvisosContexto.Provider value={valor}>
      <div className={'pagina' + (saindoPagina ? ' saindo' : '')}>
        <Suspense fallback={<div className="centro">Carregando…</div>}>
          {pagina === 'imoveis' ? <Imoveis {...props} /> : pagina === 'agenda' ? <Agenda {...props} /> : pagina === 'dashboard' ? <Dashboard {...props} /> : <Kanban {...props} />}
        </Suspense>
      </div>
      <AvisoHoje usuarioId={usuario.id} hoje={avisos.hoje} carregado={carregado} onVerAgenda={() => onPagina('agenda')} />
    </AvisosContexto.Provider>
  )
}
