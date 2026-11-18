// Telas e janelas carregadas sob demanda: separa o pacote do site público (vitrine) do pacote do CRM,
// e dentro do CRM carrega cada aba/janela apenas quando necessário. Depois que a tela principal aparece,
// o restante é baixado em segundo plano para deixar a navegação instantânea.
import { lazy } from 'react'

function preguicoso(carregar) {
  const Componente = lazy(carregar)
  Componente.precarregar = carregar // chamar import() de novo reaproveita o que já foi baixado
  return Componente
}

// Site público (vitrine)
export const Inicio = preguicoso(() => import('./components/Inicio.jsx'))
export const Vitrine = preguicoso(() => import('./components/Vitrine.jsx'))
export const VitrineImovel = preguicoso(() => import('./components/VitrineImovel.jsx'))
export const Contato = preguicoso(() => import('./components/Contato.jsx'))

// Painel CRM (carregado só quando acessa /painel ou recuperação de senha)
export const Login = preguicoso(() => import('./components/Login.jsx'))
export const AreaLogada = preguicoso(() => import('./components/AreaLogada.jsx'))
export const NovaSenha = preguicoso(() => import('./components/NovaSenha.jsx'))

// Telas e modais internos do CRM
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
export const BuscaGlobalModal = preguicoso(() => import('./components/BuscaGlobalModal.jsx'))

const TODOS_CRM = [Imoveis, Proprietarios, CaptacaoRapida, Agenda, MetasModal, EtapaModal, LeadModal, ImovelDetalhes, ImovelModal, PerfilModal, BuscaGlobalModal]
const TODOS_PUBLICO = [Inicio, Vitrine, VitrineImovel, Contato]

function agendarQuandoOcioso(fn) {
  if (navigator.connection?.saveData) return () => {}
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(fn, { timeout: 4000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 2000)
  return () => clearTimeout(id)
}

// Baixa o restante do CRM quando o navegador está ocioso
export function precarregarRestante() {
  return agendarQuandoOcioso(() => TODOS_CRM.forEach((c) => c.precarregar().catch(() => {})))
}

// Baixa as outras páginas da vitrine pública em segundo plano (sem baixar código do CRM)
export function precarregarVitrine() {
  return agendarQuandoOcioso(() => TODOS_PUBLICO.forEach((c) => c.precarregar().catch(() => {})))
}
