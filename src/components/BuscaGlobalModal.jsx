import { useEffect, useMemo, useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import { lerCache, gravarCache } from '../lib/cache.js'
import { comCodigo } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

const ATALHOS_PAGINAS = [
  { id: 'dashboard', titulo: 'Ir para Dashboard', subtitulo: 'Funil de metas e KPIs' },
  { id: 'leads', titulo: 'Ir para Leads', subtitulo: 'Quadro kanban e lista' },
  { id: 'imoveis', titulo: 'Ir para Imóveis', subtitulo: 'Carteira de imóveis e captações' },
  { id: 'proprietarios', titulo: 'Ir para Proprietários', subtitulo: 'Cadastro de proprietários' },
  { id: 'agenda', titulo: 'Ir para Agenda', subtitulo: 'Visitas, retornos e exclusividades' },
]

const norm = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const rotuloEtapa = (id) => ETAPAS.find((e) => e.id === id)?.rotulo ?? id

// Paleta de comando global (Ctrl+K): busca instantânea em imóveis, leads e telas do CRM.
export default function BuscaGlobalModal({ onFechar, onSelecionar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [termo, setTermo] = useState('')
  const [imoveis, setImoveis] = useState(() => lerCache('crm:imoveis') ?? [])
  const [leads, setLeads] = useState(() => lerCache('crm:leads') ?? [])
  const [carregando, setCarregando] = useState(() => !lerCache('crm:imoveis') || !lerCache('crm:leads'))
  const [indiceAtivo, setIndiceAtivo] = useState(0)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('imoveis').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
    ]).then(([resI, resL]) => {
      if (!ativo) return
      if (!resI.error && resI.data) {
        setImoveis(resI.data)
        gravarCache('crm:imoveis', resI.data)
      }
      if (!resL.error && resL.data) {
        setLeads(resL.data)
        gravarCache('crm:leads', resL.data)
      }
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  const resultados = useMemo(() => {
    const q = norm(termo.trim())
    const itens = []

    const paginasMatch = ATALHOS_PAGINAS.filter(
      (p) => !q || norm(p.titulo).includes(q) || norm(p.subtitulo).includes(q)
    )
    for (const p of paginasMatch.slice(0, q ? 3 : 5)) {
      itens.push({
        chave: `pag-${p.id}`,
        grupo: 'Telas',
        titulo: p.titulo,
        detalhe: p.subtitulo,
        acao: () => onSelecionar({ pagina: p.id }),
      })
    }

    const imoveisMatch = (q
      ? imoveis.filter((i) =>
          [i.codigo, i.titulo, i.bairro, i.cidade, i.nome_condominio, i.proprietario_nome].some((v) =>
            norm(v).includes(q)
          )
        )
      : imoveis
    ).slice(0, 6)

    for (const i of imoveisMatch) {
      const preco = precosDoImovel(i)[0]?.texto
      itens.push({
        chave: `imo-${i.id}`,
        grupo: 'Imóveis',
        titulo: comCodigo(i),
        detalhe: [i.bairro, i.cidade, preco, i.proprietario_nome].filter(Boolean).join(' · '),
        acao: () => onSelecionar({ pagina: 'imoveis', imovelId: i.id }),
      })
    }

    const leadsMatch = (q
      ? leads.filter((l) => [l.nome, l.telefone, l.email, l.busca_bairros].some((v) => norm(v).includes(q)))
      : leads
    ).slice(0, 6)

    for (const l of leadsMatch) {
      itens.push({
        chave: `lead-${l.id}`,
        grupo: 'Leads',
        titulo: l.nome,
        detalhe: [rotuloEtapa(l.status), l.telefone, l.busca_bairros].filter(Boolean).join(' · '),
        acao: () => onSelecionar({ pagina: 'leads', leadId: l.id }),
      })
    }

    return itens
  }, [termo, imoveis, leads, onSelecionar])

  useEffect(() => {
    setIndiceAtivo(0)
  }, [termo])

  useEffect(() => {
    function aoTecla(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        fechar(onFechar)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndiceAtivo((i) => (resultados.length ? (i + 1) % resultados.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndiceAtivo((i) => (resultados.length ? (i - 1 + resultados.length) % resultados.length : 0))
      } else if (e.key === 'Enter' && resultados[indiceAtivo]) {
        e.preventDefault()
        const acao = resultados[indiceAtivo].acao
        fechar(() => {
          onFechar()
          acao()
        })
      }
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [resultados, indiceAtivo, fechar, onFechar])

  const escolher = (item) => {
    fechar(() => {
      onFechar()
      item.acao()
    })
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div
        className="modal modal-busca-global"
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida global"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="busca-global-entrada">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Digite código do imóvel (CA0001), bairro, lead ou tela…"
            aria-label="Pesquisar no sistema"
          />
          <button type="button" className="link pequeno" onClick={() => fechar(onFechar)}>
            Esc
          </button>
        </div>

        <div className="busca-global-lista" role="listbox">
          {carregando && resultados.length === 0 ? (
            <p className="vazio">Carregando dados…</p>
          ) : resultados.length === 0 ? (
            <p className="vazio">Nenhum resultado para “{termo}”.</p>
          ) : (
            resultados.map((item, idx) => {
              const anterior = resultados[idx - 1]
              const mostrarGrupo = !anterior || anterior.grupo !== item.grupo
              return (
                <div key={item.chave}>
                  {mostrarGrupo && <div className="busca-global-grupo">{item.grupo}</div>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === indiceAtivo}
                    className={'busca-global-item' + (idx === indiceAtivo ? ' ativo' : '')}
                    onMouseEnter={() => setIndiceAtivo(idx)}
                    onClick={() => escolher(item)}
                  >
                    <strong>{item.titulo}</strong>
                    {item.detalhe && <span>{item.detalhe}</span>}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
