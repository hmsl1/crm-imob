// Favoritos da vitrine pública (salvos no navegador do visitante, sem necessidade de login).
import { useCallback, useEffect, useState } from 'react'
import { precosDoImovel } from './format.js'

const CHAVE = 'crm:vitrine-favoritos'
const EVENTO = 'favoritos-alterados'

export function lerFavoritos() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    const lista = bruto ? JSON.parse(bruto) : []
    return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string' && c) : []
  } catch {
    return []
  }
}

export function salvarFavoritos(lista) {
  const unica = [...new Set(lista.filter(Boolean))]
  try {
    localStorage.setItem(CHAVE, JSON.stringify(unica))
  } catch {
    /* modo privado sem storage */
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: unica }))
  return unica
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState(lerFavoritos)

  useEffect(() => {
    const atualizar = () => setFavoritos(lerFavoritos())
    window.addEventListener(EVENTO, atualizar)
    window.addEventListener('storage', atualizar)
    return () => {
      window.removeEventListener(EVENTO, atualizar)
      window.removeEventListener('storage', atualizar)
    }
  }, [])

  const ehFavorito = useCallback((codigo) => favoritos.includes(codigo), [favoritos])

  const alternarFavorito = useCallback((codigo) => {
    if (!codigo) return
    const atual = lerFavoritos()
    const proxima = atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo]
    setFavoritos(salvarFavoritos(proxima))
  }, [])

  const limparFavoritos = useCallback(() => {
    setFavoritos(salvarFavoritos([]))
  }, [])

  return { favoritos, ehFavorito, alternarFavorito, limparFavoritos }
}

export function mensagemFavoritos(imoveis = []) {
  if (!imoveis.length) return 'Olá, gostaria de informações sobre imóveis do site.'
  const linhas = imoveis.map((i) => {
    const preco = precosDoImovel(i)[0]?.texto
    return `• ${i.codigo}${i.titulo ? ` — ${i.titulo}` : ''}${preco ? ` (${preco})` : ''}`
  })
  return `Olá! Salvei estes imóveis no site e gostaria de mais detalhes:\n\n${linhas.join('\n')}`
}
