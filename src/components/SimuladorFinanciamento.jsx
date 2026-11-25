import { useMemo, useState } from 'react'
import { moeda, linkWhatsapp } from '../lib/format.js'

const PRAZOS = [10, 15, 20, 25, 30, 35]

// Simulador rápido de financiamento (SAC e Price) exibido na página pública de imóveis à venda.
export default function SimuladorFinanciamento({ imovel, whatsapp }) {
  const valor = Number(imovel?.valor_venda ?? 0)
  const [entradaPct, setEntradaPct] = useState(20)
  const [prazoAnos, setPrazoAnos] = useState(30)
  const [taxaAnual, setTaxaAnual] = useState(10.5)

  const calculo = useMemo(() => {
    if (!valor || valor <= 0) return null
    const entrada = (valor * entradaPct) / 100
    const financiado = Math.max(0, valor - entrada)
    const meses = prazoAnos * 12
    const taxaMensal = Number(taxaAnual) / 100 / 12
    const amortizacao = meses > 0 ? financiado / meses : 0
    const primeiraSAC = amortizacao + financiado * taxaMensal
    const parcelaPrice =
      taxaMensal > 0 && meses > 0
        ? (financiado * (taxaMensal * Math.pow(1 + taxaMensal, meses))) / (Math.pow(1 + taxaMensal, meses) - 1)
        : amortizacao
    return { entrada, financiado, primeiraSAC, parcelaPrice }
  }, [valor, entradaPct, prazoAnos, taxaAnual])

  if (!calculo) return null

  const msgWhatsApp =
    `Olá! Simulei o financiamento do imóvel ${imovel.codigo ?? ''} (${imovel.titulo}) no site:\n` +
    `• Valor: ${moeda(valor)}\n` +
    `• Entrada (${entradaPct}%): ${moeda(calculo.entrada)}\n` +
    `• Prazo: ${prazoAnos} anos\n` +
    `• 1ª parcela estimada (SAC): ${moeda(calculo.primeiraSAC)}\n\n` +
    `Gostaria de simular minha aprovação de crédito.`

  return (
    <section className="secao simulador-caixa" aria-label="Simulador de financiamento">
      <div className="simulador-topo">
        <h3>Simulador de financiamento</h3>
        <span className="suave">Estimativa ilustrativa</span>
      </div>

      <div className="simulador-controles">
        <label>
          <span>
            Entrada: <strong>{entradaPct}%</strong> ({moeda(calculo.entrada)})
          </span>
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            value={entradaPct}
            onChange={(e) => setEntradaPct(Number(e.target.value))}
          />
        </label>

        <div className="duas">
          <label>
            Prazo
            <select value={prazoAnos} onChange={(e) => setPrazoAnos(Number(e.target.value))}>
              {PRAZOS.map((ano) => (
                <option key={ano} value={ano}>
                  {ano} anos ({ano * 12}x)
                </option>
              ))}
            </select>
          </label>
          <label>
            Taxa de juros (% ao ano)
            <input
              type="number"
              min="4"
              max="20"
              step="0.5"
              value={taxaAnual}
              onChange={(e) => setTaxaAnual(Math.max(1, Math.min(25, Number(e.target.value) || 0)))}
            />
          </label>
        </div>
      </div>

      <div className="simulador-resultados">
        <div>
          <small>Valor financiado</small>
          <strong>{moeda(calculo.financiado)}</strong>
        </div>
        <div>
          <small>1ª parcela (SAC)</small>
          <strong>{moeda(calculo.primeiraSAC)}</strong>
        </div>
        <div>
          <small>Parcela fixa (Price)</small>
          <strong>{moeda(calculo.parcelaPrice)}</strong>
        </div>
      </div>

      <p className="dica-simulador">
        Valores aproximados sem TR/seguros. Consulte condições reais conforme seu banco e renda.
      </p>

      {whatsapp && (
        <a className="btn-whatsapp" href={linkWhatsapp(whatsapp, msgWhatsApp)} target="_blank" rel="noreferrer">
          Consultar aprovação pelo WhatsApp
        </a>
      )}
    </section>
  )
}
