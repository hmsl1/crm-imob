// Localização do imóvel no Google Maps (função pura: sem React nem Supabase).
// Usa o endereço (rua e número), o bairro e a cidade cadastrados. Sem nenhum deles, não há o que buscar.

const limpo = (v) => String(v ?? '').trim()

// "Rua das Flores, 123, Centro, Cabo Frio" (só entram as partes preenchidas)
export function enderecoParaMapa(imovel) {
  return [imovel?.endereco, imovel?.bairro, imovel?.cidade].map(limpo).filter(Boolean).join(', ')
}

// Com rua e número o mapa marca o ponto; só com bairro/cidade ele mostra a região
export const enderecoExato = (imovel) => limpo(imovel?.endereco) !== ''

// Link que abre o Google Maps (app ou site) já pesquisando o endereço, ou null se não há dados
export function linkMapa(imovel) {
  const consulta = enderecoParaMapa(imovel)
  if (!consulta) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`
}
