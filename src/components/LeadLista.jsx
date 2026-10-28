import { useEffect, useMemo, useState } from 'react'
import { ETAPAS } from '../lib/supabase.js'
import { moeda, linkWhatsapp } from '../lib/format.js'
import { ORIGENS, rotuloOrigem, resumoDoPerfil } from '../lib/lead.js'
import { GRUPOS_ETAPA, contarPorGrupo, filtrarLeads, ordenarLeads, paginar } from '../lib/leadLista.js'
import Opcoes from './Opcoes.jsx'

const rotuloEtapa = (id) => ETAPAS.find((e) => e.id === id)?.rotulo ?? id
const data = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

const COLUNAS = [
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'etapa', rotulo: 'Etapa' },
  { chave: 'origem', rotulo: 'Origem' },
  { chave: null, rotulo: 'Telefone' },
  { chave: null, rotulo: 'Procura' },
  { chave: 'criado', rotulo: 'Cadastro' },
  { chave: 'valor', rotulo: 'Valor fechado' },
]

// Visão em tabela de todos os leads, inclusive os concluídos e perdidos: filtros, ordenação e páginas.
export default function LeadLista({ leads, busca, onAbrir }) {
  const [grupo, setGrupo] = useState('todas')
  const [origem, setOrigem] = useState('')
  const [ordem, setOrdem] = useState({ chave: 'criado', direcao: 'desc' })
  const [pagina, setPagina] = useState(1)

  const contagem = useMemo(() => contarPorGrupo(leads), [leads])
  const filtrados = useMemo(() => filtrarLeads(leads, { busca, grupo, origem }), [leads, busca, grupo, origem])
  const ordenados = useMemo(() => ordenarLeads(filtrados, ordem.chave, ordem.direcao), [filtrados, ordem])
  const { itens, pagina: atual, totalPaginas, total } = paginar(ordenados, pagina)

  // volta para a primeira página quando muda o filtro, a busca ou a ordem
  useEffect(() => setPagina(1), [busca, grupo, origem, ordem])

  function ordenarPor(chave) {
    setOrdem((o) => (o.chave === chave ? { chave, direcao: o.direcao === 'asc' ? 'desc' : 'asc' } : { chave, direcao: chave === 'criado' || chave === 'valor' ? 'desc' : 'asc' }))
  }

  return (
    <main className="lista-leads">
      <div className="filtros-lista">
        <div className="grupos" role="group" aria-label="Filtrar por situação">
          {GRUPOS_ETAPA.map((g) => (
            <button key={g.id} type="button" className={'grupo-etapa' + (grupo === g.id ? ' ativo' : '')} aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}>
              {g.rotulo} <span className="contagem">{contagem[g.id]}</span>
            </button>
          ))}
        </div>
        <select value={origem} onChange={(e) => setOrigem(e.target.value)} aria-label="Filtrar por origem">
          <Opcoes lista={ORIGENS.map((o) => ({ id: o.id, rotulo: o.curto }))} vazio="Todas as origens" />
        </select>
      </div>

      {total === 0 ? (
        <div className="vazio-grande">
          <p>{leads.length === 0 ? 'Nenhum lead cadastrado ainda.' : 'Nenhum lead com esses filtros.'}</p>
        </div>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela-leads">
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th key={c.rotulo} aria-sort={c.chave && ordem.chave === c.chave ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.chave ? (
                      <button type="button" className="link ordenar" onClick={() => ordenarPor(c.chave)}>
                        {c.rotulo}
                        {ordem.chave === c.chave ? (ordem.direcao === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    ) : (
                      c.rotulo
                    )}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((lead) => (
                <tr key={lead.id} onClick={() => onAbrir(lead)}>
                  <td>
                    <button type="button" className="link nome-lead" onClick={(e) => (e.stopPropagation(), onAbrir(lead))}>
                      {lead.nome}
                    </button>
                  </td>
                  <td>
                    <span className={'etapa-tag ' + lead.status}>{rotuloEtapa(lead.status)}</span>
                  </td>
                  <td>{rotuloOrigem(lead.origem)}</td>
                  <td>{lead.telefone ?? '—'}</td>
                  <td className="procura" title={resumoDoPerfil(lead)}>{resumoDoPerfil(lead) || '—'}</td>
                  <td>{data(lead.created_at)}</td>
                  <td>{lead.status === 'fechado' && lead.valor_fechado != null ? moeda(lead.valor_fechado) : '—'}</td>
                  <td>
                    {lead.telefone && (
                      <a className="btn-whatsapp" href={linkWhatsapp(lead.telefone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="paginacao">
        <span className="suave">
          {total} {total === 1 ? 'lead' : 'leads'}
        </span>
        {totalPaginas > 1 && (
          <>
            <span className="espaco" />
            <button type="button" className="pequeno" disabled={atual <= 1} onClick={() => setPagina(atual - 1)}>
              Anterior
            </button>
            <span className="suave">
              Página {atual} de {totalPaginas}
            </span>
            <button type="button" className="pequeno" disabled={atual >= totalPaginas} onClick={() => setPagina(atual + 1)}>
              Próxima
            </button>
          </>
        )}
      </div>
    </main>
  )
}
