import { useMemo } from 'react'
import { RECURSOS } from '../config.js'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import { bairrosDosImoveis } from '../lib/bairros.js'
import { opcoesDoCampo } from '../lib/opcoesImoveis.js'
import { CHIPS_FILTRO_VITRINE, buscaEhCodigo } from '../lib/vitrine.js'

// Barra de busca da vitrine (tipo, cidade, bairro, condomínio, dormitórios, vagas, chips, valor e código),
// usada tanto na Início (leva para /imoveis com os filtros na URL) quanto na página Imóveis (filtra na hora).
export default function BuscaImoveis({ imoveis, valores, aoMudar, aoBuscar }) {
  const cidades = useMemo(() => opcoesDoCampo(imoveis, 'cidade'), [imoveis])
  const bairros = useMemo(() => bairrosDosImoveis(imoveis), [imoveis])
  const condominios = useMemo(() => opcoesDoCampo(imoveis, 'nome_condominio'), [imoveis])

  const campo = (nome) => ({
    value: valores[nome] ?? '',
    onChange: (e) => aoMudar(nome, e.target.value),
  })

  const chipsAtivos = Array.isArray(valores.caracteristicas) ? valores.caracteristicas : []
  const alternarChip = (id) => {
    const proximos = chipsAtivos.includes(id) ? chipsAtivos.filter((c) => c !== id) : [...chipsAtivos, id]
    aoMudar('caracteristicas', proximos)
  }

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
        {RECURSOS.filtrosAvancadosVitrine && (
          <>
            <select aria-label="Mínimo de dormitórios" {...campo('quartosMin')}>
              <option value="">Dormitórios</option>
              <option value="1">1+ dorms</option>
              <option value="2">2+ dorms</option>
              <option value="3">3+ dorms</option>
              <option value="4">4+ dorms</option>
            </select>
            <select aria-label="Mínimo de vagas" {...campo('vagasMin')}>
              <option value="">Vagas</option>
              <option value="1">1+ vaga</option>
              <option value="2">2+ vagas</option>
              <option value="3">3+ vagas</option>
            </select>
          </>
        )}
        <input type="number" min="0" placeholder="Valor mínimo" aria-label="Valor mínimo" {...campo('valorMin')} />
        <input type="number" min="0" placeholder="Valor máximo" aria-label="Valor máximo" {...campo('valorMax')} />
      </div>

      {RECURSOS.filtrosAvancadosVitrine && (
        <div className="chips-filtro" role="group" aria-label="Destaques rápidos">
          {CHIPS_FILTRO_VITRINE.map((chip) => {
            const ativo = chipsAtivos.includes(chip.id)
            return (
              <button
                key={chip.id}
                type="button"
                className={'chip-filtro' + (ativo ? ' ativo' : '')}
                aria-pressed={ativo}
                onClick={() => alternarChip(chip.id)}
              >
                {chip.rotulo}
              </button>
            )
          })}
        </div>
      )}

      <button type="submit" className="primario busca-botao">
        Buscar
      </button>
    </form>
  )
}
