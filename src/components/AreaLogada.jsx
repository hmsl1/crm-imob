import { useEffect, useMemo, useRef } from 'react'
import Kanban from './Kanban.jsx'
import Imoveis from './Imoveis.jsx'
import Agenda from './Agenda.jsx'
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

  const props = { usuario, pagina, onPagina }
  return (
    <AvisosContexto.Provider value={valor}>
      <div className={'pagina' + (saindoPagina ? ' saindo' : '')}>
        {pagina === 'imoveis' ? <Imoveis {...props} /> : pagina === 'agenda' ? <Agenda {...props} /> : <Kanban {...props} />}
      </div>
      <AvisoHoje usuarioId={usuario.id} hoje={avisos.hoje} carregado={carregado} onVerAgenda={() => onPagina('agenda')} />
    </AvisosContexto.Provider>
  )
}
