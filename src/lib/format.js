import { temVenda, temAluguel } from './imovel.js'

// Funções puras de formatação (fáceis de testar)

// Assume Brasil (+55) quando o número vem sem código do país
// "texto" (opcional) já abre a conversa com a mensagem preenchida
export function linkWhatsapp(telefone, texto) {
  let numeros = String(telefone).replace(/\D/g, '').replace(/^0+/, '')
  if (numeros.length <= 11) numeros = '55' + numeros
  return `https://wa.me/${numeros}` + (texto ? `?text=${encodeURIComponent(texto)}` : '')
}

// Sem destinatário: o WhatsApp pede para escolher o contato
export function linkWhatsappSemNumero(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}

export function moeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const numero = Number(valor)
  // Sem centavos: "R$ 450.000". Com centavos: sempre duas casas ("R$ 1.850,50", nunca "1.850,5").
  const casas = Math.round(numero * 100) % 100 === 0 ? 0 : 2
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

// Preços a exibir no card: venda, aluguel ou os dois (imóvel de "venda e aluguel")
export function precosDoImovel(imovel) {
  const itens = []
  if (temVenda(imovel.finalidade) && imovel.valor_venda != null) {
    itens.push({ id: 'venda', rotulo: 'Venda', texto: moeda(imovel.valor_venda) })
  }
  if (temAluguel(imovel.finalidade) && imovel.valor_aluguel != null) {
    itens.push({ id: 'aluguel', rotulo: 'Aluguel', texto: moeda(imovel.valor_aluguel) + ' /mês' })
  }
  return itens
}

// Nome provisório do corretor criado automaticamente para o usuário: "hugo.silva@x.com" -> "Hugo silva"
export function nomeDoEmail(email) {
  const local = String(email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim()
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Corretor'
}
