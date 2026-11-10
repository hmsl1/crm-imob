import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { atendeBairro } from '../lib/bairros.js'
import { filtrarVitrine, buscaEhCodigo } from '../lib/vitrine.js'
import { linkImovel } from '../lib/rota.js'
import BuscaImoveis from './BuscaImoveis.jsx'
import LayoutPublico from './LayoutPublico.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id
const FILTROS_VAZIOS = { busca: '', tipo: '', finalidade: '', cidade: '', bairro: '', condominio: '', valorMin: '', valorMax: '' }

// Página "Imóveis": lista todos os imóveis disponíveis, com busca e filtros. Os filtros podem já
// vir preenchidos pela URL (ex.: vindos da busca da Início ou de um "Imóveis por bairro").
export default function Vitrine({ navegar, filtrosIniciais = {} }) {
  const [imoveis, setImoveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ ...FILTROS_VAZIOS, ...filtrosIniciais })

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

  const filtrados = useMemo(
    () => filtrarVitrine(imoveis, filtros).filter((i) => atendeBairro(i, filtros.bairro)),
    [imoveis, filtros]
  )
  const filtrando = Object.values(filtros).some(Boolean)

  const abrir = useCallback((codigo) => navegar(linkImovel(codigo)), [navegar])

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="vitrine">
      <section className="vitrine-busca">
        <h1>Encontre o seu imóvel</h1>
        <BuscaImoveis imoveis={imoveis} valores={filtros} aoMudar={(campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))} aoBuscar={() => {}} />
        {buscaEhCodigo(filtros.busca) && <p className="dica-busca">Buscando pelo código {filtros.busca.toUpperCase()}</p>}
      </section>

      <div className="contagem-filtro faixa">
        {filtrados.length} {filtrados.length === 1 ? 'imóvel' : 'imóveis'}
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
                  <span className="detalhes">
                    {[rotulo(TIPOS_IMOVEL, i.tipo), i.nome_condominio, i.bairro, i.cidade].filter(Boolean).join(' · ')}
                  </span>
                  <ul className="lista-caracteristicas">
                    {i.dormitorios != null && <li>{i.dormitorios} {i.dormitorios === 1 ? 'dormitório' : 'dormitórios'}</li>}
                    {i.suites != null && i.suites > 0 && <li>{i.suites} {i.suites === 1 ? 'suíte' : 'suítes'}</li>}
                    {i.banheiros != null && <li>{i.banheiros} {i.banheiros === 1 ? 'banheiro' : 'banheiros'}</li>}
                    {(i.vagas_cobertas || i.vagas_descobertas) ? <li>{(i.vagas_cobertas ?? 0) + (i.vagas_descobertas ?? 0)} vagas</li> : null}
                    {i.area_construida != null && <li>{Number(i.area_construida)} m²</li>}
                  </ul>
                  <span className="link ver-detalhes">Ver detalhes →</span>
                </div>
              </article>
            )
          })}
        </main>
      )}
    </LayoutPublico>
  )
}
