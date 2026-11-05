import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TIPOS_IMOVEL, STATUS_IMOVEL, FINALIDADES, atendeFinalidade } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { bairrosDosImoveis, atendeBairro } from '../lib/bairros.js'
import { useNomeDoCorretor } from '../lib/corretor.js'
import Topo from './Topo.jsx'
import { ImovelModal, ImovelDetalhes, CaptacaoRapida } from '../componentesPreguicosos.js'
import { situacaoExclusividade } from '../lib/exclusividade.js'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

// No filtro só "Venda" e "Aluguel": cada um já inclui os imóveis de "Venda e aluguel"
const FINALIDADES_FILTRO = FINALIDADES.filter((f) => f.id !== 'venda_aluguel')

export default function Imoveis({ usuario, pagina, onPagina }) {
  const { nome: nomeCorretor } = useNomeDoCorretor(usuario)
  const [imoveis, setImoveis] = useState([])
  const [corretores, setCorretores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [status, setStatus] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [bairro, setBairro] = useState('')
  const [soCompletar, setSoCompletar] = useState(false) // só os cadastros rápidos que ainda faltam completar
  const [captando, setCaptando] = useState(false)
  // null | { modo: 'ver' | 'editar' | 'novo', id?: string, aba?: string }
  const [aberto, setAberto] = useState(null)
  // aba da tela de detalhes; lembrada ao voltar do formulário de edição
  const [abaDetalhe, setAbaDetalhe] = useState('principal')

  const abrirDetalhes = (id) => {
    setAbaDetalhe('principal')
    setAberto({ modo: 'ver', id })
  }

  const carregar = useCallback(async () => {
    const [resImoveis, resCorretores] = await Promise.all([
      supabase.from('imoveis').select('*').order('created_at', { ascending: false }),
      supabase.from('corretores').select('id, nome'),
    ])
    setCarregando(false)
    if (resImoveis.error) {
      setErro(resImoveis.error.message)
      return null
    }
    setErro('')
    setImoveis(resImoveis.data)
    setCorretores(resCorretores.data ?? [])
    return resImoveis.data
  }, [])

  useEffect(() => {
    carregar()
    // nome do corretor alterado em "Meu perfil": recarrega a lista
    window.addEventListener('corretor-atualizado', carregar)
    return () => window.removeEventListener('corretor-atualizado', carregar)
  }, [carregar])

  const bairros = useMemo(() => bairrosDosImoveis(imoveis), [imoveis])
  // se o bairro escolhido deixou de existir (imóvel editado ou excluído), volta para "todos"
  const bairroAtivo = bairros.some((b) => b.id === bairro) ? bairro : ''

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return imoveis.filter((i) => {
      if (!atendeBairro(i, bairroAtivo)) return false
      if (soCompletar && !i.a_completar) return false
      if (tipo && i.tipo !== tipo) return false
      if (status && i.status !== status) return false
      if (!atendeFinalidade(i.finalidade, finalidade)) return false
      if (!termo) return true
      return [i.titulo, i.codigo, i.bairro, i.cidade, i.proprietario_nome].some(
        (v) => v && v.toLowerCase().includes(termo)
      )
    })
  }, [imoveis, busca, tipo, status, finalidade, bairroAtivo, soCompletar])

  const filtrando = busca || tipo || status || finalidade || bairroAtivo || soCompletar
  const totalCompletar = imoveis.filter((i) => i.a_completar).length
  const imovelAberto = aberto?.id ? imoveis.find((i) => i.id === aberto.id) : null

  // Depois de salvar uma edição, volta para a visualização do imóvel já atualizado.
  // Se o imóvel foi excluído (ou era novo), fecha tudo.
  async function aoSalvar() {
    const id = aberto?.id
    const lista = await carregar()
    setAberto(id && lista?.some((i) => i.id === id) ? { modo: 'ver', id } : null)
  }

  return (
    <div className="app">
      <Topo usuario={usuario} pagina={pagina} onPagina={onPagina}>
        <input
          className="busca"
          type="search"
          placeholder="Buscar por título, bairro, cidade ou proprietário"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button onClick={() => setCaptando(true)}>Captação rápida</button>
        <button className="primario" onClick={() => setAberto({ modo: 'novo' })}>
          + Novo imóvel
        </button>
      </Topo>

      <div className="filtros">
        <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} aria-label="Finalidade">
          <option value="">Venda e aluguel</option>
          {FINALIDADES_FILTRO.map((f) => (
            <option key={f.id} value={f.id}>
              {f.rotulo}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {TIPOS_IMOVEL.map((t) => (
            <option key={t.id} value={t.id}>
              {t.rotulo}
            </option>
          ))}
        </select>
        <select value={bairroAtivo} onChange={(e) => setBairro(e.target.value)} aria-label="Bairro">
          <option value="">Todos os bairros</option>
          {bairros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.rotulo} ({b.total})
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Disponibilidade">
          <option value="">Todas as disponibilidades</option>
          {STATUS_IMOVEL.map((s) => (
            <option key={s.id} value={s.id}>
              {s.rotulo}
            </option>
          ))}
        </select>
        {totalCompletar > 0 && (
          <label className="check filtro-completar">
            <input type="checkbox" checked={soCompletar} onChange={(e) => setSoCompletar(e.target.checked)} />
            A completar ({totalCompletar})
          </label>
        )}
        <span className="contagem-filtro">
          {filtrados.length} {filtrados.length === 1 ? 'imóvel' : 'imóveis'}
        </span>
      </div>

      {erro && <p className="erro faixa">{erro}</p>}

      {carregando ? (
        <div className="centro">Carregando imóveis…</div>
      ) : filtrados.length === 0 ? (
        <div className="vazio-grande">
          {filtrando ? (
            <p>Nenhum imóvel com esses filtros.</p>
          ) : (
            <>
              <p>Você ainda não cadastrou nenhum imóvel.</p>
              <button className="primario" onClick={() => setAberto({ modo: 'novo' })}>
                Cadastrar o primeiro imóvel
              </button>
            </>
          )}
        </div>
      ) : (
        <main className="grade-imoveis">
          {filtrados.map((i) => {
            const precos = precosDoImovel(i)
            return (
              <article
                key={i.id}
                className="imovel"
                tabIndex={0}
                onClick={() => abrirDetalhes(i.id)}
                onKeyDown={(e) => e.key === 'Enter' && abrirDetalhes(i.id)}
              >
                <div className="foto">
                  {i.fotos?.[0] ? (
                    <img src={i.fotos[0]} alt={i.titulo} loading="lazy" decoding="async" />
                  ) : (
                    <span>Sem foto</span>
                  )}
                  <span className={'selo status-imovel ' + i.status}>{rotulo(STATUS_IMOVEL, i.status)}</span>
                  {i.fotos?.length > 1 && <span className="selo-fotos">{i.fotos.length} fotos</span>}
                  {i.a_completar && <span className="selo a-completar">A completar</span>}
                </div>
                <div className="corpo">
                  {precos.length === 0 ? (
                    <span className="preco">
                      <small>Valor não informado</small>
                    </span>
                  ) : (
                    precos.map((p) => (
                      <span className="preco" key={p.id}>
                        {precos.length > 1 && <small>{p.rotulo} </small>}
                        {p.texto}
                      </span>
                    ))
                  )}
                  {i.codigo && <span className="codigo-imovel">{i.codigo}</span>}
                  <strong>{i.titulo}</strong>
                  <span className="detalhes">
                    {[rotulo(TIPOS_IMOVEL, i.tipo), i.bairro, i.cidade].filter(Boolean).join(' · ')}
                  </span>
                  <span className="detalhes">
                    {[
                      i.dormitorios != null && `${i.dormitorios} ${i.dormitorios === 1 ? 'dormitório' : 'dormitórios'}`,
                      i.area_construida != null && `${Number(i.area_construida)} m²`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {i.proprietario_nome && <span className="detalhes">Proprietário: {i.proprietario_nome}</span>}
                  {(() => {
                    const ex = situacaoExclusividade(i)
                    return ex.estado === 'vence' || ex.estado === 'vencida' ? <span className={'alerta-exclusividade ' + ex.estado}>{ex.texto}</span> : null
                  })()}
                </div>
              </article>
            )
          })}
        </main>
      )}

      <Suspense fallback={null}>
      {aberto?.modo === 'ver' && imovelAberto && (
        <ImovelDetalhes
          imovel={imovelAberto}
          corretores={corretores}
          corretor={nomeCorretor}
          somenteLeitura={Boolean(imovelAberto.owner_id) && imovelAberto.owner_id !== usuario.id}
          existentes={imoveis}
          onAbrirOutro={(id) => {
            setAbaDetalhe('principal')
            setAberto({ modo: 'ver', id })
          }}
          aba={abaDetalhe}
          onAba={setAbaDetalhe}
          onFechar={() => setAberto(null)}
          // sem argumento: abre o formulário na mesma aba que você estava vendo; com "fotos": direto nas fotos
          onEditar={(aba) => setAberto({ modo: 'editar', id: imovelAberto.id, aba: typeof aba === 'string' ? aba : abaDetalhe })}
          // edição de um campo: atualiza só esse imóvel na lista, sem recarregar tudo
          onAtualizado={(atualizado) => setImoveis((lista) => lista.map((i) => (i.id === atualizado.id ? atualizado : i)))}
        />
      )}

      {captando && (
        <CaptacaoRapida
          usuario={usuario}
          existentes={imoveis}
          onFechar={() => setCaptando(false)}
          onSalvo={async () => {
            setCaptando(false)
            await carregar()
          }}
        />
      )}

      {(aberto?.modo === 'novo' || (aberto?.modo === 'editar' && imovelAberto)) && (
        <ImovelModal
          imovel={aberto.modo === 'editar' ? imovelAberto : null}
          abaInicial={aberto.aba}
          usuario={usuario}
          existentes={imoveis}
          onAbrirOutro={(id) => setAberto({ modo: 'ver', id })}
          // cancelar a edição volta para a visualização; cancelar um cadastro novo fecha
          onFechar={() => setAberto(aberto.modo === 'editar' ? { modo: 'ver', id: aberto.id } : null)}
          onSalvo={aoSalvar}
        />
      )}
      </Suspense>
    </div>
  )
}
