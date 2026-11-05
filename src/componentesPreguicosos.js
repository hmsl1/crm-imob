// Telas e janelas carregadas sob demanda: o primeiro acesso baixa só o essencial (login, dashboard, leads e barra superior),
// o que deixa a abertura bem mais rápida no celular. Depois que a tela principal aparece, o resto é baixado
// em segundo plano, então navegar e abrir janelas continua instantâneo.
import { lazy } from 'react'

function preguicoso(carregar) {
  const Componente = lazy(carregar)
  Componente.precarregar = carregar // chamar import() de novo reaproveita o que já foi baixado
  return Componente
}

export const Imoveis = preguicoso(() => import('./components/Imoveis.jsx'))
export const MetasModal = preguicoso(() => import('./components/MetasModal.jsx'))
export const Agenda = preguicoso(() => import('./components/Agenda.jsx'))
export const EtapaModal = preguicoso(() => import('./components/EtapaModal.jsx'))
export const LeadModal = preguicoso(() => import('./components/LeadModal.jsx'))
export const ImovelModal = preguicoso(() => import('./components/ImovelModal.jsx'))
export const ImovelDetalhes = preguicoso(() => import('./components/ImovelDetalhes.jsx'))
export const CaptacaoRapida = preguicoso(() => import('./components/CaptacaoRapida.jsx'))
export const Proprietarios = preguicoso(() => import('./components/Proprietarios.jsx'))
export const PerfilModal = preguicoso(() => import('./components/PerfilModal.jsx'))

const TODOS = [Imoveis, Proprietarios, CaptacaoRapida, Agenda, MetasModal, EtapaModal, LeadModal, ImovelDetalhes, ImovelModal, PerfilModal]

// Baixa o restante quando o navegador está ocioso (e não gasta dados no modo "economia de dados")
export function precarregarRestante() {
  if (navigator.connection?.saveData) return () => {}
  const iniciar = () => TODOS.forEach((c) => c.precarregar().catch(() => {}))
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(iniciar, { timeout: 4000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(iniciar, 2000)
  return () => clearTimeout(id)
}
