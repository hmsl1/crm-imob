// Esqueletos de carregamento (no lugar de só um texto "Carregando…"), no formato aproximado
// de cada tela — dá uma ideia imediata do que está vindo e evita o "pulo" de layout quando
// os dados chegam.

export function EsqueletoQuadro({ colunas = 4 }) {
  return (
    <div className="quadro esqueleto-quadro" aria-hidden="true">
      {Array.from({ length: colunas }).map((_, i) => (
        <div className="coluna" key={i}>
          <div className="esqueleto esqueleto-titulo-coluna" />
          <div className="cartoes">
            {Array.from({ length: 2 + ((i * 2) % 3) }).map((__, j) => (
              <div className="lead esqueleto-cartao" key={j}>
                <div className="esqueleto esqueleto-linha" style={{ width: '70%' }} />
                <div className="esqueleto esqueleto-linha" style={{ width: '45%' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EsqueletoGrade({ itens = 6 }) {
  return (
    <div className="grade-imoveis esqueleto-grade" aria-hidden="true">
      {Array.from({ length: itens }).map((_, i) => (
        <div className="imovel esqueleto-cartao-imovel" key={i}>
          <div className="esqueleto esqueleto-foto" />
          <div className="corpo">
            <div className="esqueleto esqueleto-linha" style={{ width: '40%' }} />
            <div className="esqueleto esqueleto-linha" style={{ width: '85%' }} />
            <div className="esqueleto esqueleto-linha" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EsqueletoLista({ linhas = 6 }) {
  return (
    <div className="esqueleto-lista" aria-hidden="true">
      {Array.from({ length: linhas }).map((_, i) => (
        <div className="esqueleto-linha-lista" key={i}>
          <div className="esqueleto esqueleto-linha" style={{ width: '22%' }} />
          <div className="esqueleto esqueleto-linha" style={{ width: '38%' }} />
          <div className="esqueleto esqueleto-linha" style={{ width: '15%' }} />
        </div>
      ))}
    </div>
  )
}
