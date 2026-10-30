// Filtro por bairro: lista os bairros que existem nos imóveis cadastrados, sem se perder com
// diferenças de maiúsculas, acentos ou espaços ("centro", "Centro " e "CENTRO" viram um só).

export const chaveBairro = (b) =>
  String(b ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

// [{ id: 'centro', rotulo: 'Centro', total: 3 }] em ordem alfabética (pt-BR). Imóveis sem bairro ficam de fora.
export function bairrosDosImoveis(imoveis) {
  const mapa = new Map()
  for (const i of imoveis) {
    const id = chaveBairro(i.bairro)
    if (!id) continue
    const atual = mapa.get(id)
    if (atual) atual.total += 1
    else mapa.set(id, { id, rotulo: String(i.bairro).replace(/\s+/g, ' ').trim(), total: 1 })
  }
  return [...mapa.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

export const atendeBairro = (imovel, id) => !id || chaveBairro(imovel.bairro) === id
