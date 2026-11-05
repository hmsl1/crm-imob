import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { bairrosDosImoveis, atendeBairro } from '../lib/bairros.js'
import { filtrarVitrine, buscaEhCodigo } from '../lib/vitrine.js'
import { linkImovel } from '../lib/rota.js'
import { SiteTopo, SiteRodape } from './SiteCabecalhoRodape.jsx'
import BotaoWhatsappFlutuante from './BotaoWhatsappFlutuante.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

// Site público: lista os imóveis disponíveis, com busca (inclusive por código) e filtros.
// "Comprar"/"Alugar" (no cabeçalho) definem a finalidade pela URL; aqui só refinamos tipo e bairro.
export default function Vitrine({ navegar, finalidadeInicial = '' }) {
  const [imoveis, setImoveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const finalidade = finalidadeInicial
  const [bairro, setBairro] = useState('')

  useEffect(() => {
    document.title = 'CRZ Imóveis'
  }, [])

  useEffect(() => {
    let ativo = true
    supabase
      .from('vitrine_imoveis')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        setCarregando(false)
        setErro(error ? 'Não foi possível carregar os imóveis agora.' : '')
        setImoveis(data ?? [])
      })
    return () => {
      ativo = false
    }
  }, [])

  const bairros = useMemo(() => bairrosDosImoveis(imoveis), [imoveis])
  const bairroAtivo = bairros.some((b) => b.id === bairro) ? bairro : ''
  const filtrados = useMemo(
    () => filtrarVitrine(imoveis, { busca, finalidade, tipo }).filter((i) => atendeBairro(i, bairroAtivo)),
    [imoveis, busca, finalidade, tipo, bairroAtivo]
  )
  const filtrando = busca || tipo || finalidade || bairroAtivo

  const abrir = useCallback((codigo) => navegar(linkImovel(codigo)), [navegar])

  return (
    <div className="vitrine">
      <SiteTopo navegar={navegar} finalidade={finalidade} />

      <section className="vitrine-busca">
        <h1>Encontre o seu imóvel</h1>
        <input
          className="busca-codigo"
          type="search"
          placeholder="Busque por código (ex.: CA0001), título ou bairro"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar imóvel"
        />
        {buscaEhCodigo(busca) && <p className="dica-busca">Buscando pelo código {busca.toUpperCase()}</p>}
      </section>

      <div className="filtros">
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
        <span className="contagem-filtro">
          {filtrados.length} {filtrados.length === 1 ? 'imóvel' : 'imóveis'}
        </span>
      </div>

      {erro && <p className="erro faixa">{erro}</p>}

      {carregando ? (
        <div className="centro">Carregando imóveis…</div>
      ) : filtrados.length === 0 ? (
        <div className="vazio-grande">
          <p>{filtrando ? 'Nenhum imóvel com esses filtros.' : 'Nenhum imóvel disponível no momento.'}</p>
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
                onClick={() => abrir(i.codigo)}
                onKeyDown={(e) => e.key === 'Enter' && abrir(i.codigo)}
              >
                <div className="foto">
                  {i.foto_capa ? (
                    <img src={i.foto_capa} alt={i.titulo} loading="lazy" decoding="async" />
                  ) : (
                    <span>Sem foto</span>
                  )}
                  {i.total_fotos > 1 && <span className="selo-fotos">{i.total_fotos} fotos</span>}
                </div>
                <div className="corpo">
                  {precos.length === 0 ? (
                    <span className="preco">
                      <small>Consulte o valor</small>
                    </span>
                  ) : (
                    precos.map((p) => (
                      <span className="preco" key={p.id}>
                        {precos.length > 1 && <small>{p.rotulo} </small>}
                        {p.texto}
                      </span>
                    ))
                  )}
                  <span className="codigo-imovel">{i.codigo}</span>
                  <strong>{i.titulo}</strong>
                  <span className="detalhes">{[rotulo(TIPOS_IMOVEL, i.tipo), i.bairro, i.cidade].filter(Boolean).join(' · ')}</span>
                  <span className="detalhes">
                    {[
                      i.dormitorios != null && `${i.dormitorios} ${i.dormitorios === 1 ? 'dormitório' : 'dormitórios'}`,
                      i.area_construida != null && `${Number(i.area_construida)} m²`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              </article>
            )
          })}
        </main>
      )}

      <SiteRodape />
      <BotaoWhatsappFlutuante />
    </div>
  )
}
