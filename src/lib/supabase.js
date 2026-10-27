import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && anonKey)

// Só cria o cliente se as variáveis existirem, para a tela de aviso funcionar sem quebrar.
// Trocar de plano/provedor = trocar essas duas variáveis, sem mexer no código.
export const supabase = configurado ? createClient(url, anonKey) : null

export const ETAPAS = [
  { id: 'novo', rotulo: 'Novo lead' },
  { id: 'contato', rotulo: 'Em contato' },
  { id: 'visita', rotulo: 'Visita' },
  { id: 'proposta', rotulo: 'Proposta' },
  { id: 'fechado', rotulo: 'Fechado' },
  { id: 'perdido', rotulo: 'Perdido' },
]

export const ORIGENS = ['manual', 'meta', 'google', 'indicacao', 'site']
