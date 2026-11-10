import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TIPOS_IMOVEL, FINALIDADES, PADROES, sufixoIptu, ESTADOS_IMOVEL, POSICOES, POSICOES_SOLAR, GRUPOS_CARACTERISTICAS, PISOS } from '../lib/imovel.js'
import { precosDoImovel, moeda, linkWhatsapp } from '../lib/format.js'
import { mensagemInteresse } from '../lib/vitrine.js'
import { linkVitrine } from '../lib/rota.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import LayoutPublico from './LayoutPublico.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id
const vazio = (v) => v === null || v === undefined || v === ''

// Página pública de um imóvel: fotos, características e um botão para falar no WhatsApp sobre ele.
export default function VitrineImovel({ codigo, navegar }) {
  const [imovel, setImovel] = useState(undefined) // undefined = carregando, null = não encontrado
  const [atual, setAtual] = useState(0)
  const contato = useContatoSite()
  const whatsapp = contato?.whatsapp ?? null

  useEffect(() => {
    let ativo = true
    setImovel(undefined)
    setAtual(0)
    supabase
      .from('vitrine_imovel')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setImovel(data ?? null)
      })
    return () => {
      ativo = false
    }
  }, [codigo])

  useEffect(() => {
    document.title = imovel ? `${imovel.codigo} · ${imovel.titulo} — CRZ Imóveis` : 'CRZ Imóveis'
  }, [imovel])

  if (imovel === undefined) return <div className="centro">Carregando…</div>

  if (imovel === null) {
    return (
      <LayoutPublico navegar={navegar} paginaAtiva="imovel">
        <div className="vazio-grande">
          <p>Não encontramos o imóvel "{codigo}". Ele pode ter sido vendido/alugado ou o código está incorreto.</p>
          <button className="primario" onClick={() => navegar(linkVitrine)}>
            Ver todos os imóveis
          </button>
        </div>
      </LayoutPublico>
    )
  }

  const fotos = imovel.fotos ?? []
  const precos = precosDoImovel(imovel)
  const linkFalar = whatsapp ? linkWhatsapp(whatsapp, mensagemInteresse(imovel)) : null

  const dados = [
    !vazio(imovel.area_construida) && [`Área construída`, `${Number(imovel.area_construida)} m²`],
    !vazio(imovel.area_terreno) && [`Área do terreno`, `${Number(imovel.area_terreno)} m²`],
    !vazio(imovel.dormitorios) && ['Dormitórios', imovel.dormitorios],
    !vazio(imovel.suites) && ['Suítes', imovel.suites],
    !vazio(imovel.banheiros) && ['Banheiros', imovel.banheiros],
    !vazio(imovel.salas) && ['Salas', imovel.salas],
    (!vazio(imovel.vagas_cobertas) || !vazio(imovel.vagas_descobertas)) && [
      'Vagas',
      [imovel.vagas_cobertas && `${imovel.vagas_cobertas} cobertas`, imovel.vagas_descobertas && `${imovel.vagas_descobertas} descobertas`].filter(Boolean).join(' · ') || '0',
    ],
    imovel.elevador && ['Elevador', 'Sim'],
    !vazio(imovel.estado_imovel) && ['Situação', rotulo(ESTADOS_IMOVEL, imovel.estado_imovel)],
    !vazio(imovel.posicao) && ['Posição', rotulo(POSICOES, imovel.posicao)],
    !vazio(imovel.posicao_solar) && ['Posição solar', rotulo(POSICOES_SOLAR, imovel.posicao_solar)],
    imovel.vista_mar && ['Vista mar', 'Sim'],
    !vazio(imovel.padrao) && ['Padrão', rotulo(PADROES, imovel.padrao)],
    imovel.aceita_financiamento && ['Aceita financiamento', 'Sim'],
    !imovel.sem_condominio && !vazio(imovel.valor_condominio) && ['Condomínio', `${moeda(imovel.valor_condominio)} /mês`],
    !imovel.sem_iptu && !vazio(imovel.valor_iptu) && ['IPTU', moeda(imovel.valor_iptu) + sufixoIptu(imovel.iptu_periodo)],
  ].filter(Boolean)

  const marcados = (lista, coluna) => lista.filter((item) => (imovel[coluna] ?? []).includes(item.id))

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="imovel">
      <div className="vitrine-imovel">
        <button type="button" className="link voltar" onClick={() => navegar(linkVitrine)}>
          ← Ver todos os imóveis
        </button>

        {fotos.length > 0 ? (
          <div className="galeria-vitrine">
            <img src={fotos[atual]} alt={imovel.titulo} className="foto-principal" />
            {fotos.length > 1 && (
              <div className="galeria-miniaturas">
                {fotos.map((url, idx) => (
                  <button type="button" key={url} className={idx === atual ? 'ativa' : ''} aria-label={`Ver foto ${idx + 1}`} onClick={() => setAtual(idx)}>
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="galeria-vitrine sem-foto">Sem fotos</div>
        )}

        <div className="cabecalho-imovel">
          <div>
            <span className="codigo-imovel">{imovel.codigo}</span>
            <h1>{imovel.titulo}</h1>
            <p className="suave">{[rotulo(TIPOS_IMOVEL, imovel.tipo), imovel.nome_condominio, imovel.bairro, imovel.cidade].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="precos-vitrine">
            {precos.length === 0 ? <span className="valor">Consulte o valor</span> : precos.map((p) => (
              <span className="valor" key={p.id}>
                <small>{p.rotulo}</small>
                {p.texto}
              </span>
            ))}
            <span className="etiqueta">{rotulo(FINALIDADES, imovel.finalidade)}</span>
          </div>
        </div>

        {linkFalar && (
          <a className="botao-whatsapp-grande" href={linkFalar} target="_blank" rel="noreferrer">
            Falar no WhatsApp sobre este imóvel
          </a>
        )}

        {dados.length > 0 && (
          <section className="secao">
            <h3>Detalhes</h3>
            <dl className="dados">
              {dados.map(([rot, valor]) => (
                <div className="campo" key={rot}>
                  <dt>{rot}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {GRUPOS_CARACTERISTICAS.map((g) => {
          const itens = marcados(g.itens, 'caracteristicas')
          if (itens.length === 0) return null
          return (
            <section className="secao" key={g.id}>
              <h3>{g.titulo}</h3>
              <div className="grade-checks">
                {itens.map((item) => (
                  <span key={item.id} className="item-estado sim">
                    <span aria-hidden="true">✓</span> {item.rotulo}
                  </span>
                ))}
              </div>
            </section>
          )
        })}
        {marcados(PISOS, 'pisos').length > 0 && (
          <section className="secao">
            <h3>Tipo de piso</h3>
            <div className="grade-checks">
              {marcados(PISOS, 'pisos').map((item) => (
                <span key={item.id} className="item-estado sim">
                  <span aria-hidden="true">✓</span> {item.rotulo}
                </span>
              ))}
            </div>
          </section>
        )}

        {imovel.comentarios && (
          <section className="secao">
            <h3>Sobre o imóvel</h3>
            <p className="multilinha">{imovel.comentarios}</p>
          </section>
        )}

        {linkFalar && (
          <a className="botao-whatsapp-grande" href={linkFalar} target="_blank" rel="noreferrer">
            Falar no WhatsApp sobre este imóvel
          </a>
        )}
      </div>
    </LayoutPublico>
  )
}
