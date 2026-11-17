// Ícones pequenos usados na lista de características dos cards (quartos, banheiros, área).
// Sempre dentro de um <span className="carac-item"> junto do número, sem escrever o nome do campo.

export function IconeCama(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <path d="M3 18v2M21 18v2" />
      <path d="M3 13h18" />
      <path d="M6 13V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
    </svg>
  )
}

export function IconeChuveiro(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4" />
      <path d="M3 10h14" />
      <path d="M8 10v1M12 10v1M16 10v1" />
      <path d="M7 14v1M11 14v1M15 14v1" />
      <path d="M7 18v1M11 18v1M15 18v1" />
    </svg>
  )
}

export function IconeArea(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9h3M4 15h3M20 9h-3M20 15h-3M9 4v3M15 4v3M9 20v-3M15 20v-3" />
    </svg>
  )
}

export function IconeVaga(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 16v-5l1.8-4.5A2 2 0 0 1 8.66 5h6.68a2 2 0 0 1 1.86 1.5L19 11v5" />
      <path d="M5 16h14M5 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1M19 16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Linha de ícones com dormitórios, banheiros e área (terreno entre parênteses, quando houver).
export function CaracteristicasImovel({ imovel }) {
  const itens = []
  if (imovel.dormitorios) itens.push({ icone: <IconeCama />, valor: imovel.dormitorios })
  if (imovel.banheiros) itens.push({ icone: <IconeChuveiro />, valor: imovel.banheiros })
  if (imovel.area_construida) {
    itens.push({
      icone: <IconeArea />,
      valor: (
        <>
          {imovel.area_construida}m²
          {imovel.area_terreno ? <span className="carac-terreno"> (terreno {imovel.area_terreno}m²)</span> : null}
        </>
      ),
    })
  } else if (imovel.area_terreno) {
    itens.push({ icone: <IconeArea />, valor: <>terreno {imovel.area_terreno}m²</> })
  }
  if (itens.length === 0) return null
  return (
    <div className="lista-caracteristicas">
      {itens.map((it, idx) => (
        <span className="carac-item" key={idx}>
          {it.icone}
          {it.valor}
        </span>
      ))}
    </div>
  )
}
