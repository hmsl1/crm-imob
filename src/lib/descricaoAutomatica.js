// Gera um texto descritivo simples a partir dos campos já preenchidos no formulário (tipo, cômodos,
// área, localização, características...). O corretor não precisa escrever do zero: clica em "Gerar
// descrição automática", o texto cai no campo "Comentários" (mostrado no site como "Sobre o imóvel")
// e pode editar à vontade antes de salvar. Função pura, fácil de testar.
import { GRUPOS_CARACTERISTICAS } from './imovel.js'

const ROTULO_TIPO = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Imóvel comercial',
  galpao: 'Galpão',
  rural: 'Imóvel rural',
  outro: 'Imóvel',
}

// Só 1 e 2 mudam de palavra por gênero em português ("um/uma", "dois/duas"); do 3 em diante o
// numeral é igual, então usamos o algarismo a partir daí.
function numeral(n, generoFeminino) {
  if (n === 1) return generoFeminino ? 'uma' : 'um'
  if (n === 2) return generoFeminino ? 'duas' : 'dois'
  return String(n)
}

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// IDs das características mais "vendáveis", na ordem em que entram na frase quando presentes.
const CARACTERISTICAS_EM_DESTAQUE = [
  'piscina',
  'churrasqueira',
  'area_gourmet',
  'salao_festas',
  'sacada_varanda',
  'mobiliado',
  'ar_condicionado',
  'jardim_inverno',
]

function rotulosDasCaracteristicas(ids) {
  const todas = GRUPOS_CARACTERISTICAS.flatMap((g) => g.itens)
  return CARACTERISTICAS_EM_DESTAQUE.filter((id) => ids.includes(id))
    .map((id) => todas.find((item) => item.id === id)?.rotulo)
    .filter(Boolean)
}

// Junta uma lista em português: "a", "a e b", "a, b e c"
function juntarEm(lista) {
  if (lista.length === 0) return ''
  if (lista.length === 1) return lista[0]
  return `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`
}

export function gerarDescricaoAutomatica(form) {
  const ehTerreno = form.tipo === 'terreno'
  const frases = []

  // 1) abertura: tipo + onde fica
  const local = []
  if (form.nome_condominio) local.push(`no condomínio ${form.nome_condominio}`)
  if (form.bairro) local.push(`no bairro ${form.bairro}`)
  if (form.cidade) local.push(`em ${form.cidade}`)
  frases.push(`${ROTULO_TIPO[form.tipo] ?? 'Imóvel'}${local.length ? ' ' + local.join(', ') : ''}.`)

  // 2) cômodos e vagas (não se aplica a terreno)
  if (!ehTerreno) {
    const dormitorios = numero(form.dormitorios)
    const suites = numero(form.suites)
    const banheiros = numero(form.banheiros)
    const salas = numero(form.salas)
    const vagasCobertas = numero(form.vagas_cobertas)
    const vagasDescobertas = numero(form.vagas_descobertas)
    const totalVagas = vagasCobertas + vagasDescobertas

    const partes = []
    if (dormitorios > 0) {
      let parte = `${numeral(dormitorios, false)} dormitório${dormitorios > 1 ? 's' : ''}`
      if (suites > 0) parte += `, sendo ${numeral(suites, true)} suíte${suites > 1 ? 's' : ''}`
      partes.push(parte)
    } else if (suites > 0) {
      partes.push(`${numeral(suites, true)} suíte${suites > 1 ? 's' : ''}`)
    }
    if (banheiros > 0) partes.push(`${numeral(banheiros, false)} banheiro${banheiros > 1 ? 's' : ''}`)
    if (salas > 0) partes.push(salas === 1 ? 'sala' : `${numeral(salas, true)} salas`)
    if (totalVagas > 0) partes.push(`${numeral(totalVagas, true)} vaga${totalVagas > 1 ? 's' : ''} de garagem`)

    if (partes.length > 0) frases.push(`Conta com ${juntarEm(partes)}.`)
  }

  // 3) área
  const areaConstruida = numero(form.area_construida)
  const areaTerreno = numero(form.area_terreno)
  if (ehTerreno && areaTerreno > 0) {
    frases.push(`Terreno de ${areaTerreno} m².`)
  } else if (areaConstruida > 0 && areaTerreno > 0) {
    frases.push(`Área construída de ${areaConstruida} m², em terreno de ${areaTerreno} m².`)
  } else if (areaConstruida > 0) {
    frases.push(`Área construída de ${areaConstruida} m².`)
  } else if (areaTerreno > 0) {
    frases.push(`Terreno de ${areaTerreno} m².`)
  }

  // 4) diferenciais: características em destaque + elevador + vista mar + posição solar + estado
  const destaques = rotulosDasCaracteristicas(form.caracteristicas ?? []).map((r) => r.toLowerCase())
  if (form.elevador) destaques.push('elevador')
  if (destaques.length > 0) frases.push(`Possui ${juntarEm(destaques)}.`)
  if (form.vista_mar === 'sim') frases.push('Vista para o mar.')
  if (form.posicao_solar === 'manha') frases.push('Sol da manhã.')
  else if (form.posicao_solar === 'tarde') frases.push('Sol da tarde.')

  if (form.estado_imovel === 'novo') frases.push('Imóvel novo.')
  else if (form.estado_imovel === 'construcao') frases.push('Em construção.')

  return frases.join(' ')
}
