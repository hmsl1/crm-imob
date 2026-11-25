import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, ETAPAS } from '../lib/supabase.js'
import { RECURSOS } from '../config.js'
import { TIPOS_IMOVEL, FINALIDADES, ABAS_IMOVEL, comCodigo, ehDestaqueSite, alternarDestaqueLista } from '../lib/imovel.js'
import { CAMPOS_POR_ABA } from '../lib/imovelCampos.js'
import { precosDoImovel } from '../lib/format.js'
import { primeiroNome, montarMensagem } from '../lib/lead.js'
import { abrirWhatsapp } from '../lib/whatsapp.js'
import { reduziuRecentemente } from '../lib/precos.js'
import { leadsCompativeisComImovel } from '../lib/match.js'
import { lerCache, invalidarCache } from '../lib/cache.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import CampoImovel, { BotaoMapa, AlertaExclusividade } from './CampoImovel.jsx'
import HistoricoPreco from './HistoricoPreco.jsx'
import StatusImovel from './StatusImovel.jsx'
import CompartilharFicha from './CompartilharFicha.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

// Visualização do imóvel em abas (as mesmas do formulário). Cada campo tem um lápis para editar
// só aquele campo; o botão "Editar" abre o formulário completo.
export default function ImovelDetalhes({ imovel, corretores, corretor = '', existentes = [], somenteLeitura = false, aba, onAba, onFechar, onEditar, onAtualizado, onAbrirOutro }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [atual, setAtual] = useState(0) // foto exibida na galeria
  const [editando, setEditando] = useState(null) // id do campo em edição
  const [trocouAba, setTrocouAba] = useState(false) // liga o fade entre abas depois da primeira troca
  const [compartilhando, setCompartilhando] = useState(false)
  const [salvandoDestaque, setSalvandoDestaque] = useState(false)
  const [erroDestaque, setErroDestaque] = useState('')
  const [stats, setStats] = useState(null) // { interessados, visitas, realizadas }
  const [leads, setLeads] = useState(() => lerCache('crm:leads') ?? [])
  const [reduziuPreco, setReduziuPreco] = useState(false)
  const fotos = imovel.fotos ?? []
  const total = fotos.length
  const precos = precosDoImovel(imovel)
  const destacado = ehDestaqueSite(imovel)

  const mudarAba = (id) => {
    setEditando(null)
    onAba(id)
  }
  const irFoto = (passo) => setAtual((f) => (f + passo + total) % total)

  // passar as fotos com o dedo: arrastar para a esquerda/direita (mais de 40 px, sobretudo na horizontal)
  const toque = useRef(null)
  const aoTocar = (e) => (toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const aoSoltarToque = (e) => {
    const ini = toque.current
    toque.current = null
    if (!ini || total < 2) return
    const dx = e.changedTouches[0].clientX - ini.x
    const dy = e.changedTouches[0].clientY - ini.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) irFoto(dx < 0 ? 1 : -1)
  }

  // Teclado: Esc cancela a edição em andamento (ou fecha a janela); setas trocam a foto na aba de fotos,
  // mas só quando você não está digitando em um campo
  useEffect(() => {
    function aoTecla(e) {
      const digitando = e.target instanceof Element && e.target.closest('input, select, textarea')
      if (e.key === 'Escape') {
        if (editando) setEditando(null)
        else fechar(onFechar)
      } else if (!digitando && aba === 'fotos' && total > 1) {
        if (e.key === 'ArrowLeft') setAtual((f) => (f - 1 + total) % total)
        if (e.key === 'ArrowRight') setAtual((f) => (f + 1) % total)
      }
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [aba, editando, total, fechar, onFechar])

  // Dados para relatório ao proprietário e match de leads
  useEffect(() => {
    let ativo = true
    if (RECURSOS.relatorioProprietario) {
      Promise.all([
        supabase.from('lead_imovel').select('lead_id', { count: 'exact', head: true }).eq('imovel_id', imovel.id),
        supabase.from('visitas').select('id, status').eq('imovel_id', imovel.id),
      ]).then(([resVinc, resVis]) => {
        if (!ativo) return
        const listaVis = resVis.data ?? []
        setStats({
          interessados: resVinc.count ?? 0,
          visitas: listaVis.length,
          realizadas: listaVis.filter((v) => v.status === 'realizada').length,
        })
      })
    }
    if (RECURSOS.matchInteligente) {
      Promise.all([
        supabase.from('leads').select('*').in('status', ['novo', 'contato', 'visita', 'proposta']),
        supabase.from('imovel_precos').select('*').eq('imovel_id', imovel.id).order('alterado_em', { ascending: false }).limit(6),
      ]).then(([resLeads, resPrecos]) => {
        if (!ativo) return
        if (!resLeads.error && resLeads.data) setLeads(resLeads.data)
        if (!resPrecos.error && resPrecos.data) setReduziuPreco(reduziuRecentemente(resPrecos.data, 7))
      })
    }
    return () => {
      ativo = false
    }
  }, [imovel.id, imovel.valor_venda, imovel.valor_aluguel])

  const leadsCompativeis = useMemo(
    () => (RECURSOS.matchInteligente ? leadsCompativeisComImovel(imovel, leads) : []),
    [imovel, leads]
  )

  async function alternarDestaqueCapa() {
    setErroDestaque('')
    setSalvandoDestaque(true)
    const novaLista = alternarDestaqueLista(imovel.caracteristicas ?? [])
    const { data, error } = await supabase
      .from('imoveis')
      .update({ caracteristicas: novaLista })
      .eq('id', imovel.id)
      .select()
      .single()
    setSalvandoDestaque(false)
    if (error) {
      setErroDestaque(error.message)
      return
    }
    invalidarCache('vitrine:')
    onAtualizado(data)
  }

  function enviarRelatorioProprietario() {
    const nomeProp = primeiroNome(imovel.proprietario_nome)
    const saud = nomeProp ? `Olá, ${nomeProp}!` : 'Olá!'
    const precoAtual = precos.map((p) => `${p.rotulo}: ${p.texto}`).join(' · ')
    const s = stats ?? { interessados: 0, visitas: 0, realizadas: 0 }
    const msg =
      `${saud} Aqui é ${corretor || 'da equipe CRZ Imóveis'}.\n\n` +
      `Segue o resumo de acompanhamento do seu imóvel *${comCodigo(imovel)}*` +
      `${precoAtual ? ` (${precoAtual})` : ''}:\n` +
      `• Clientes interessados com ficha apresentada: ${s.interessados}\n` +
      `• Visitas registradas: ${s.visitas} (${s.realizadas} realizadas)\n\n` +
      `Seguimos trabalhando na divulgação e atendimento dos interessados. Qualquer dúvida ou ajuste, fico à disposição!`
    abrirWhatsapp(imovel.proprietario_telefone1, msg)
  }

  function avisarLeadMatch(lead) {
    if (reduziuPreco) {
      const nomeLead = primeiroNome(lead.nome)
      const saud = nomeLead ? `Olá, ${nomeLead}!` : 'Olá!'
      const precoAtual = precos.map((p) => `${p.rotulo}: ${p.texto}`).join(' · ')
      const msg =
        `${saud}${corretor ? ` Aqui é ${corretor}, corretor de imóveis.` : ''} ` +
        `O imóvel *${comCodigo(imovel)}*${imovel.bairro ? ` (${imovel.bairro})` : ''} acabou de ter uma redução de preço` +
        `${precoAtual ? ` e está por ${precoAtual}` : ''}. Como combina com o seu perfil, quer receber fotos ou agendar uma visita?`
      return abrirWhatsapp(lead.telefone, msg)
    }
    abrirWhatsapp(lead.telefone, montarMensagem('apresentacao', { lead, imovel, corretor }))
  }

  // outros imóveis do mesmo proprietário
  const outrosDoProprietario = imovel.proprietario_id ? existentes.filter((i) => i.proprietario_id === imovel.proprietario_id && i.id !== imovel.id) : []

  const local = [rotulo(TIPOS_IMOVEL, imovel.tipo), imovel.bairro, imovel.cidade].filter(Boolean).join(' · ')

  const renderCampo = (campo) => (
    <CampoImovel
      key={campo.id}
      campo={campo}
      imovel={imovel}
      corretores={corretores}
      existentes={existentes}
      editando={editando === campo.id}
      somenteLeitura={somenteLeitura}
      onEditar={() => setEditando(campo.id)}
      onCancelar={() => setEditando(null)}
      onSalvo={(atualizado) => {
        setEditando(null)
        onAtualizado(atualizado)
      }}
    />
  )

  return (
    <>
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className={'modal largo' + (trocouAba ? ' anima-abas' : '')} role="dialog" aria-modal="true" aria-label={imovel.titulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo alto">
          <div className="topo-detalhe">
            {fotos[0] && (
              <button type="button" className="capa-mini" aria-label="Ver fotos" onClick={() => mudarAba('fotos')}>
                <img src={fotos[0]} alt="" />
              </button>
            )}
            <div>
              <h2>{imovel.titulo}</h2>
              {imovel.codigo && <div className="codigo-imovel">{imovel.codigo}</div>}
              <div className="subtitulo">
                {local} <BotaoMapa imovel={imovel} />
              </div>
            </div>
          </div>
          <div className="acoes-detalhe">
            <button onClick={() => setCompartilhando(true)}>Compartilhar</button>
            {!somenteLeitura && (
              <button className="primario" onClick={() => fechar(onEditar)}>
                Editar
              </button>
            )}
            <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        {somenteLeitura && <p className="aviso-leitura">Imóvel cadastrado por outro usuário: você pode consultar e compartilhar a ficha, mas só quem cadastrou pode alterar.</p>}

        <div className="detalhe-precos">
          {precos.length === 0 ? (
            <span className="valor">
              <small>Valor não informado</small>
            </span>
          ) : (
            precos.map((p) => (
              <span className="valor" key={p.id}>
                <small>{p.rotulo}</small>
                {p.texto}
              </span>
            ))
          )}
          <span className="etiquetas">
            <span className="etiqueta">{rotulo(FINALIDADES, imovel.finalidade)}</span>
            {imovel.a_completar && <span className="etiqueta a-completar">A completar</span>}
          </span>
        </div>

        {imovel.a_completar && (
          <p className="aviso-completar" role="status">
            Captação rápida: faltam dados. Abra “Editar” e complete valores, detalhes e fotos para tirar o selo “A completar”.
          </p>
        )}
        <AlertaExclusividade imovel={imovel} />

        <StatusImovel imovel={imovel} somenteLeitura={somenteLeitura} onAtualizado={onAtualizado} />

        {RECURSOS.destaqueManualCapa && !somenteLeitura && (
          <div className="destaque-capa-barra">
            <button
              type="button"
              className={'pequeno btn-destaque-capa' + (destacado ? ' ativo' : '')}
              disabled={salvandoDestaque}
              onClick={alternarDestaqueCapa}
            >
              {salvandoDestaque
                ? 'Salvando…'
                : destacado
                  ? '★ Em destaque na capa do site'
                  : '☆ Destacar na capa do site'}
            </button>
            {destacado && !imovel.publicar_no_site && (
              <span className="suave">(Ative “Mostrar no site” para aparecer na capa)</span>
            )}
            {erroDestaque && <span className="erro">{erroDestaque}</span>}
          </div>
        )}

        <div className="abas" role="tablist">
          {ABAS_IMOVEL.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              className={aba === a.id ? 'ativa' : ''}
              onClick={() => (setTrocouAba(true), mudarAba(a.id))}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba === 'fotos' && (
          <section className="secao">
            <div className="secao-cabecalho">
              <h3>Fotos</h3>
              {!somenteLeitura && (
                <button type="button" className="pequeno" onClick={() => fechar(() => onEditar('fotos'))}>
                  Gerenciar fotos
                </button>
              )}
            </div>
            <div className="galeria">
              <div className="galeria-principal" onTouchStart={aoTocar} onTouchEnd={aoSoltarToque}>
                {total > 0 ? (
                  <img src={fotos[atual] ?? fotos[0]} alt={`${imovel.titulo}, foto ${atual + 1}`} decoding="async" draggable={false} />
                ) : (
                  <span>Sem fotos</span>
                )}
                {total > 1 && (
                  <>
                    <button type="button" className="seta esq" aria-label="Foto anterior" onClick={() => irFoto(-1)}>
                      ‹
                    </button>
                    <button type="button" className="seta dir" aria-label="Próxima foto" onClick={() => irFoto(1)}>
                      ›
                    </button>
                    <span className="contador">
                      {atual + 1}/{total}
                    </span>
                  </>
                )}
              </div>
              {total > 1 && (
                <div className="galeria-miniaturas">
                  {fotos.map((url, idx) => (
                    <button
                      type="button"
                      key={url}
                      className={idx === atual ? 'ativa' : ''}
                      aria-label={`Ver foto ${idx + 1}`}
                      onClick={() => setAtual(idx)}
                    >
                      <img src={url} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {CAMPOS_POR_ABA[aba].map((secao) => (
          <section className="secao" key={secao.id}>
            <h3>{secao.titulo}</h3>
            <dl className="dados">{secao.campos.filter((c) => !c.visivel || c.visivel(imovel)).map(renderCampo)}</dl>
            {secao.id === 'proprietario' && outrosDoProprietario.length > 0 && (
              <div className="outros-imoveis">
                <span className="suave">Outros imóveis deste proprietário:</span>
                {outrosDoProprietario.map((o) => (
                  <button key={o.id} type="button" className="link pequeno" onClick={() => onAbrirOutro?.(o.id)}>
                    {comCodigo(o)}
                  </button>
                ))}
              </div>
            )}
            {secao.id === 'proprietario' && RECURSOS.relatorioProprietario && (
              <div className="relatorio-proprietario">
                <span className="suave">
                  Acompanhamento:{' '}
                  {stats
                    ? `${stats.interessados} ${stats.interessados === 1 ? 'interessado' : 'interessados'} · ${stats.visitas} ${stats.visitas === 1 ? 'visita' : 'visitas'} (${stats.realizadas} realizadas)`
                    : 'carregando…'}
                </span>
                <button type="button" className="pequeno" onClick={enviarRelatorioProprietario}>
                  📊 Relatório p/ proprietário (WhatsApp)
                </button>
              </div>
            )}
          </section>
        ))}

        {aba === 'principal' && RECURSOS.matchInteligente && imovel.status === 'disponivel' && (
          <section className="secao secao-match-leads" aria-label="Leads compatíveis">
            <h3>
              🎯 Leads compatíveis com este imóvel
              {reduziuPreco && <span className="etiqueta reducao-badge">Preço reduzido</span>}
            </h3>
            {leadsCompativeis.length === 0 ? (
              <p className="suave">Nenhum lead ativo com perfil de busca compatível no momento.</p>
            ) : (
              <ul className="itens">
                {leadsCompativeis.map(({ lead, motivos }) => {
                  const etapa = ETAPAS.find((e) => e.id === lead.status)?.rotulo ?? lead.status
                  return (
                    <li key={lead.id} className="item-match">
                      <div className="item-info">
                        <strong>{lead.nome}</strong>
                        <span className="suave">
                          {etapa}
                          {lead.telefone ? ` · ${lead.telefone}` : ''}
                        </span>
                        <div className="motivos-match">
                          {motivos.map((m) => (
                            <span key={m} className="etiqueta">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="item-acoes">
                        <button type="button" className="pequeno primario" onClick={() => avisarLeadMatch(lead)}>
                          {reduziuPreco ? 'Avisar redução no WhatsApp' : 'Enviar no WhatsApp'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {aba === 'principal' && <HistoricoPreco imovel={imovel} />}
      </div>
    </div>
    {compartilhando && <CompartilharFicha imovel={imovel} corretor={corretor} onFechar={() => setCompartilhando(false)} />}
    </>
  )
}
