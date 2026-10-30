import { createContext, useContext } from 'react'

// Avisos da agenda compartilhados por toda a área logada (selo no menu e janelinha de hoje).
// O valor padrão deixa Topo e as páginas funcionarem mesmo fora do provedor.
export const AvisosContexto = createContext({
  avisos: { atrasados: [], hoje: [], proximos: [], total: 0, urgente: false },
  recarregar: () => {},
})

export const useAvisos = () => useContext(AvisosContexto)
