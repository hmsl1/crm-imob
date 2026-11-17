// Opções de filtro (cidade, condomínio...) a partir dos imóveis carregados: mesma ideia de bairros.js,
// mas genérica para qualquer campo de texto do imóvel. Funções puras (sem React nem Supabase).

export const chaveTexto = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// [{ id: 'porto seguro', rotulo: 'Porto Seguro', total: 3 }] em ordem alfabética (pt-BR). Vazios ficam de fora.
export function opcoesDoCampo(imoveis, campo) {
  const mapa = new Map()
  for (const i of imoveis) {
    const bruto = i[campo]
    const id = chaveTexto(bruto)
    if (!id) continue
    const atual = mapa.get(id)
    if (atual) atual.total += 1
    else mapa.set(id, { id, rotulo: String(bruto).replace(/\s+/g, ' ').trim(), total: 1 })
  }
  return [...mapa.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

export const atendeCampo = (imovel, campo, id) => !id || chaveTexto(imovel[campo]) === id
