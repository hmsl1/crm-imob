// Cache leve em memória (Stale-While-Revalidate): permite abrir telas e abas já visitadas
// instantaneamente enquanto os dados são atualizados em segundo plano.
const memoria = new Map()

export function lerCache(chave) {
  return memoria.has(chave) ? memoria.get(chave).valor : undefined
}

export function gravarCache(chave, valor) {
  memoria.set(chave, { valor, em: Date.now() })
  return valor
}

export function invalidarCache(prefixo = '') {
  if (!prefixo) {
    memoria.clear()
    return
  }
  for (const chave of memoria.keys()) {
    if (chave.startsWith(prefixo)) memoria.delete(chave)
  }
}
