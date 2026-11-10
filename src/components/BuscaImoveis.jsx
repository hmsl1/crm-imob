import { useMemo } from 'react'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import { bairrosDosImoveis } from '../lib/bairros.js'
import { opcoesDoCampo } from '../lib/opcoesImoveis.js'
import { buscaEhCodigo } from '../lib/vitrine.js'

// Barra de busca da vitrine (tipo, cidade, bairro, condomínio, valor e código/palavra), usada tanto
// na Início (leva para /imoveis com os filtros na URL) quanto na página Imóveis (filtra na hora).
// "imoveis" é a lista já carregada: as opções de cidade/bairro/condomínio vêm dela, não são fixas.
export default function BuscaImoveis({ imoveis, valores, aoMudar, aoBuscar }) {
  const cidades = useMemo(() => opcoesDoCampo(imoveis, 'cidade'), [imoveis])
  const bairros = useMemo(() => bairrosDosImoveis(imoveis), [imoveis])
  const condominios = useMemo(() => opcoesDoCampo(imoveis, 'nome_condominio'), [imoveis])

  const campo = (nome) => ({
    value: valores[nome],
    onChange: (e) => aoMudar(nome, e.target.value),
  })

  return (
    <form
      className="busca-imoveis"
      onSubmit={(e) => {
        e.preventDefault()
        aoBuscar()
      }}
    >
      <input
        className="busca-codigo"
        type="search"
        placeholder="Busque por código (ex.: CA0001), título, bairro ou condomínio"
        aria-label="Buscar imóvel"
        {...campo('busca')}
      />
      {buscaEhCodigo(valores.busca) && <p className="dica-busca">Buscando pelo código {valores.busca.toUpperCase()}</p>}

      <div className="busca-grade">
        <select aria-label="Finalidade" {...campo('finalidade')}>
          <option value="">Comprar ou alugar</option>
          <option value="venda">Comprar</option>
          <option value="aluguel">Alugar</option>
        </select>
        <select aria-label="Tipo" {...campo('tipo')}>
          <option value="">Todos os tipos</option>
          {TIPOS_IMOVEL.map((t) => (
            <option key={t.id} value={t.id}>
              {t.rotulo}
            </option>
          ))}
        </select>
        <select aria-label="Cidade" {...campo('cidade')}>
          <option value="">Toda a região</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.rotulo} ({c.total})
            </option>
          ))}
        </select>
        <select aria-label="Bairro" {...campo('bairro')}>
          <option value="">Todos os bairros</option>
          {bairros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.rotulo} ({b.total})
            </option>
          ))}
        </select>
        {condominios.length > 0 && (
          <select aria-label="Condomínio" {...campo('condominio')}>
            <option value="">Todos os condomínios</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo} ({c.total})
              </option>
            ))}
          </select>
        )}
        <input type="number" min="0" placeholder="Valor mínimo" aria-label="Valor mínimo" {...campo('valorMin')} />
        <input type="number" min="0" placeholder="Valor máximo" aria-label="Valor máximo" {...campo('valorMax')} />
        <button type="submit" className="primario">
          Buscar
        </button>
      </div>
    </form>
  )
}
