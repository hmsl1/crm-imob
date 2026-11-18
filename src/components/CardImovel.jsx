import { RECURSOS } from '../config.js'
import { TIPOS_IMOVEL, ehDestaqueSite } from '../lib/imovel.js'
import { precosDoImovel } from '../lib/format.js'
import { useFavoritos } from '../lib/favoritos.js'
import { CaracteristicasImovel } from './IconesImovel.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

function IconeCoracao({ cheio }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={cheio ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

export default function CardImovel({ imovel, onAbrir, mostrarTipo = false, ehDestaque = false, prioridadeFoto = false }) {
  const { ehFavorito, alternarFavorito } = useFavoritos()
  const precos = precosDoImovel(imovel)
  const salvo = RECURSOS.favoritosVitrine && ehFavorito(imovel.codigo)
  const destaque = RECURSOS.destaqueManualCapa && (ehDestaque || ehDestaqueSite(imovel))
  const rico = RECURSOS.cardsRicos

  const badgeExtra = rico
    ? imovel.vista_mar
      ? 'Vista mar'
      : imovel.aceita_financiamento
        ? 'Financiável'
        : null
    : null

  return (
    <article
      className={'imovel' + (rico ? ' imovel-rico' : '')}
      tabIndex={0}
      onClick={() => onAbrir(imovel.codigo)}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir(imovel.codigo)}
    >
      <div className="foto">
        <div className="badges-topo">
          {imovel.nome_condominio && <span className="selo-condominio">{imovel.nome_condominio}</span>}
          {destaque && <span className="selo destaque-site">★ Destaque</span>}
          {badgeExtra && <span className="selo badge-info">{badgeExtra}</span>}
        </div>
        {imovel.foto_capa ? (
          <img
            src={imovel.foto_capa}
            alt={imovel.titulo}
            loading={prioridadeFoto ? 'eager' : 'lazy'}
            fetchPriority={prioridadeFoto ? 'high' : undefined}
            decoding="async"
          />
        ) : (
          <span>Sem foto</span>
        )}
        {RECURSOS.favoritosVitrine && imovel.codigo && (
          <button
            type="button"
            className={'btn-favorito' + (salvo ? ' ativo' : '')}
            aria-pressed={salvo}
            aria-label={salvo ? `Remover ${imovel.titulo} dos favoritos` : `Salvar ${imovel.titulo} nos favoritos`}
            title={salvo ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}
            onClick={(e) => {
              e.stopPropagation()
              alternarFavorito(imovel.codigo)
            }}
          >
            <IconeCoracao cheio={salvo} />
          </button>
        )}
        {imovel.total_fotos > 1 && <span className="selo-fotos">{imovel.total_fotos} fotos</span>}
      </div>

      <div className="corpo">
        {imovel.codigo && <span className="codigo-imovel">{imovel.codigo}</span>}
        <strong className="titulo-card">{imovel.titulo}</strong>
        <span className="detalhes">
          {[mostrarTipo ? rotulo(TIPOS_IMOVEL, imovel.tipo) : null, mostrarTipo ? imovel.nome_condominio : null, imovel.bairro, imovel.cidade]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <CaracteristicasImovel imovel={imovel} />
        <div className="corpo-divisoria" />
        <div className="corpo-rodape">
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
          <span className="link ver-detalhes">Ver detalhes →</span>
        </div>
      </div>
    </article>
  )
}
