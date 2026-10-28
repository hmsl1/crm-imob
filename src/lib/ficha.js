// Texto da "ficha" do imóvel para enviar por WhatsApp. Nunca inclui dados do proprietário.
import { moeda, precosDoImovel } from './format.js'
import { TIPOS_IMOVEL, GRUPOS_CARACTERISTICAS } from './imovel.js'

const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`

// Itens de destaque (lazer primeiro), no máximo "max"
export function destaquesDoImovel(i, max = 8) {
  const marcadas = i.caracteristicas ?? []
  const nomes = [...GRUPOS_CARACTERISTICAS]
    .reverse()
    .flatMap((g) => g.itens)
    .filter((item) => marcadas.includes(item.id))
    .map((item) => item.rotulo)
  if (i.elevador) nomes.unshift('Elevador')
  if (i.vista_mar) nomes.unshift('Vista mar')
  return nomes.slice(0, max)
}

// Links das primeiras fotos (as fotos ficam num bucket público; o WhatsApp mostra a prévia do primeiro link)
export function linksDasFotos(imovel, max = 4) {
  return (imovel.fotos ?? []).slice(0, max)
}

// Corpo da ficha, sem as fotos (as fotos são acrescentadas no envio, como links ou como anexos)
export function fichaDoImovel(i, { corretor = '' } = {}) {
  const linhas = [`*${i.titulo}*`]

  const tipo = TIPOS_IMOVEL.find((t) => t.id === i.tipo)?.rotulo
  const onde = [i.bairro, i.cidade].filter(Boolean).join(', ')
  const local = [tipo, onde].filter(Boolean).join(' · ')
  if (local) linhas.push(local)

  const precos = precosDoImovel(i)
  if (precos.length) {
    linhas.push('')
    precos.forEach((p) => linhas.push(`${p.rotulo}: ${p.texto.replace(' /mês', '/mês')}`))
  }

  const custos = []
  if (i.sem_condominio) custos.push('Sem condomínio')
  else if (i.valor_condominio != null) custos.push(`Condomínio: ${moeda(i.valor_condominio)}/mês`)
  if (i.valor_iptu != null) custos.push(`IPTU: ${moeda(i.valor_iptu)}`)
  if (custos.length) linhas.push(custos.join(' · '))

  const specs = []
  if (i.dormitorios != null) {
    const suites = i.suites ? ` (${plural(i.suites, 'suíte', 'suítes')})` : ''
    specs.push(plural(i.dormitorios, 'dormitório', 'dormitórios') + suites)
  }
  if (i.banheiros != null) specs.push(plural(i.banheiros, 'banheiro', 'banheiros'))
  const vagas = (i.vagas_cobertas ?? 0) + (i.vagas_descobertas ?? 0)
  if (vagas > 0) specs.push(plural(vagas, 'vaga', 'vagas'))
  if (i.area_construida != null) specs.push(`${Number(i.area_construida)} m² construídos`)
  if (i.area_terreno != null) specs.push(`terreno de ${Number(i.area_terreno)} m²`)
  if (specs.length) {
    linhas.push('')
    linhas.push(specs.join(' · '))
  }

  const destaques = destaquesDoImovel(i)
  if (destaques.length) linhas.push(`Destaques: ${destaques.join(', ')}`)

  if (corretor) {
    linhas.push('')
    linhas.push(`Corretor: ${corretor}`)
  }
  return linhas.join('\n')
}

// Texto final para o link do WhatsApp: ficha + links das fotos (quando pedido)
export function fichaComFotos(corpo, imovel, { incluirFotos = true } = {}) {
  const links = incluirFotos ? linksDasFotos(imovel) : []
  return links.length ? `${corpo}\n\nFotos:\n${links.join('\n')}` : corpo
}
