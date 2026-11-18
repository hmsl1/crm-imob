import { useCallback, useEffect, useMemo, useState } from 'react'
import { RECURSOS } from '../config.js'
import { useVitrineImoveis } from '../lib/useVitrineImoveis.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import { useFavoritos, mensagemFavoritos } from '../lib/favoritos.js'
import { linkWhatsapp } from '../lib/format.js'
import { atendeBairro } from '../lib/bairros.js'
import { filtrarVitrine, buscaEhCodigo } from '../lib/vitrine.js'
import { linkImovel, linkBuscaImoveis } from '../lib/rota.js'
import BuscaImoveis from './BuscaImoveis.jsx'
import LayoutPublico from './LayoutPublico.jsx'
import CardImovel from './CardImovel.jsx'
import { EsqueletoGrade } from './Esqueleto.jsx'

const FILTROS_VAZIOS = {
  busca: '',
  tipo: '',
  finalidade: '',
  cidade: '',
  bairro: '',
  condominio: '',
  valorMin: '',
  valorMax: '',
  quartosMin: '',
  vagasMin: '',
  caracteristicas: [],
  soFavoritos: false,
}

// Página "Imóveis": lista todos os imóveis disponíveis, com busca, filtros avançados e favoritos.
export default function Vitrine({ navegar, filtrosIniciais = {} }) {
  const { imoveis, carregando, erro } = useVitrineImoveis()
  const { favoritos } = useFavoritos()
  const contato = useContatoSite()
  const [filtros, setFiltros] = useState({ ...FILTROS_VAZIOS, ...filtrosIniciais })

  useEffect(() => {
    document.title = 'CRZ Imóveis'
  }, [])

  const assinaturaIniciais = JSON.stringify(filtrosIniciais)
  useEffect(() => {
    setFiltros({ ...FILTROS_VAZIOS, ...filtrosIniciais })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaIniciais])

  const atualizarFiltro = useCallback((campo, valor) => {
    setFiltros((prev) => {
      const proximos = { ...prev, [campo]: valor }
      const destino = linkBuscaImoveis(proximos)
      if (destino !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, '', destino)
      }
      return proximos
    })
  }, [])

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_VAZIOS)
    window.history.replaceState({}, '', linkBuscaImoveis(FILTROS_VAZIOS))
  }, [])

  const filtrados = useMemo(
    () => filtrarVitrine(imoveis, filtros, favoritos).filter((i) => atendeBairro(i, filtros.bairro)),
    [imoveis, filtros, favoritos]
  )

  const filtrando = Boolean(
    filtros.busca ||
      filtros.tipo ||
      filtros.finalidade ||
      filtros.cidade ||
      filtros.bairro ||
      filtros.condominio ||
      filtros.valorMin ||
      filtros.valorMax ||
      filtros.quartosMin ||
      filtros.vagasMin ||
      filtros.soFavoritos ||
      filtros.caracteristicas?.length > 0
  )

  const imoveisFavoritos = useMemo(
    () => imoveis.filter((i) => favoritos.includes(i.codigo)),
    [imoveis, favoritos]
  )
  const linkEnviarFavoritos = contato?.whatsapp && imoveisFavoritos.length > 0
    ? linkWhatsapp(contato.whatsapp, mensagemFavoritos(imoveisFavoritos))
    : null

  const abrir = useCallback((codigo) => navegar(linkImovel(codigo)), [navegar])

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="vitrine">
      <section className="vitrine-busca">
        <h1>{filtros.soFavoritos ? 'Meus imóveis favoritos' : 'Encontre o seu imóvel'}</h1>
        <BuscaImoveis imoveis={imoveis} valores={filtros} aoMudar={atualizarFiltro} aoBuscar={() => {}} />
        {buscaEhCodigo(filtros.busca) && <p className="dica-busca">Buscando pelo código {filtros.busca.toUpperCase()}</p>}
      </section>

      <div className="barra-vitrine">
        <span className="contagem-vitrine">
          {filtrados.length} {filtrados.length === 1 ? 'imóvel' : 'imóveis'}
        </span>
        <div className="acoes-barra-vitrine">
          {RECURSOS.favoritosVitrine && (favoritos.length > 0 || filtros.soFavoritos) && (
            <button
              type="button"
              className={'chip-filtro' + (filtros.soFavoritos ? ' ativo' : '')}
              aria-pressed={filtros.soFavoritos}
              onClick={() => atualizarFiltro('soFavoritos', !filtros.soFavoritos)}
            >
              ♥ Meus favoritos ({favoritos.length})
            </button>
          )}
          {filtrando && (
            <button type="button" className="link pequeno" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}
          {RECURSOS.favoritosVitrine && linkEnviarFavoritos && (
            <a className="btn-whatsapp" href={linkEnviarFavoritos} target="_blank" rel="noreferrer">
              Enviar favoritos no WhatsApp
            </a>
          )}
        </div>
      </div>

      {erro && <p className="erro faixa">{erro}</p>}

      {carregando && imoveis.length === 0 ? (
        <EsqueletoGrade itens={6} />
      ) : filtrados.length === 0 ? (
        <div className="vazio-grande">
          <p>
            {filtros.soFavoritos
              ? 'Você ainda não salvou nenhum imóvel nos favoritos.'
              : filtrando
                ? 'Nenhum imóvel com esses filtros.'
                : 'Nenhum imóvel disponível no momento.'}
          </p>
          {filtrando && (
            <button type="button" className="primario" onClick={limparFiltros}>
              Ver todos os imóveis
            </button>
          )}
        </div>
      ) : (
        <main className="grade-imoveis">
          {filtrados.map((i, idx) => (
            <CardImovel key={i.id} imovel={i} mostrarTipo prioridadeFoto={idx < 3} onAbrir={abrir} />
          ))}
        </main>
      )}
    </LayoutPublico>
  )
}
