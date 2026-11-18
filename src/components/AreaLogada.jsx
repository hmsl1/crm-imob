import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RECURSOS } from '../config.js'
import Kanban from './Kanban.jsx'
import Dashboard from './Dashboard.jsx'
import { Imoveis, Proprietarios, Agenda, BuscaGlobalModal, precarregarRestante } from '../componentesPreguicosos.js'
import AvisoHoje from './AvisoHoje.jsx'
import { AvisosContexto } from '../lib/avisosContexto.js'
import { useAvisosAgenda } from '../lib/useAvisosAgenda.js'

// Tudo o que aparece depois do login: a página atual, o selo de avisos no menu, busca Ctrl+K e a janelinha de hoje.
export default function AreaLogada({ usuario, pagina, onPagina }) {
  const { avisos, carregado, recarregar } = useAvisosAgenda(usuario)
  const valor = useMemo(() => ({ avisos, recarregar }), [avisos, recarregar])
  const [buscaGlobal, setBuscaGlobal] = useState(false)
  const [alvoPendente, setAlvoPendente] = useState(null) // { leadId?, imovelId? }

  // ao trocar de página, confere de novo a agenda (algo pode ter sido criado ou concluído)
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) primeira.current = false
    else recarregar()
  }, [pagina, recarregar])

  useEffect(() => precarregarRestante(), [])

  // Atalho global Ctrl+K / Cmd+K e clique no botão da barra superior
  useEffect(() => {
    if (!RECURSOS.buscaGlobalCtrlK) return
    const aoTecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaGlobal((v) => !v)
      }
    }
    const aoEvento = () => setBuscaGlobal(true)
    window.addEventListener('keydown', aoTecla)
    window.addEventListener('abrir-busca-global', aoEvento)
    return () => {
      window.removeEventListener('keydown', aoTecla)
      window.removeEventListener('abrir-busca-global', aoEvento)
    }
  }, [])

  const limparAlvo = useCallback(() => setAlvoPendente(null), [])

  const irDaBuscaGlobal = useCallback(
    (destino) => {
      setAlvoPendente(destino.imovelId || destino.leadId ? destino : null)
      if (destino.pagina !== pagina) onPagina(destino.pagina)
    },
    [pagina, onPagina]
  )

  const props = { usuario, pagina, onPagina }
  return (
    <AvisosContexto.Provider value={valor}>
      <div className="pagina">
        <Suspense fallback={<div className="centro">Carregando…</div>}>
          {pagina === 'imoveis' ? (
            <Imoveis {...props} abrirImovelId={alvoPendente?.imovelId ?? null} onLimparAlvo={limparAlvo} />
          ) : pagina === 'proprietarios' ? (
            <Proprietarios {...props} />
          ) : pagina === 'agenda' ? (
            <Agenda {...props} />
          ) : pagina === 'dashboard' ? (
            <Dashboard {...props} />
          ) : (
            <Kanban {...props} abrirLeadId={alvoPendente?.leadId ?? null} onLimparAlvo={limparAlvo} />
          )}
        </Suspense>
      </div>
      <AvisoHoje usuarioId={usuario.id} hoje={avisos.hoje} carregado={carregado} onVerAgenda={() => onPagina('agenda')} />
      {RECURSOS.buscaGlobalCtrlK && buscaGlobal && (
        <Suspense fallback={null}>
          <BuscaGlobalModal onFechar={() => setBuscaGlobal(false)} onSelecionar={irDaBuscaGlobal} />
        </Suspense>
      )}
    </AvisosContexto.Provider>
  )
}
