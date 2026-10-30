import { useEffect, useState } from 'react'
import { TIPOS_IMOVEL, FINALIDADES, ABAS_IMOVEL } from '../lib/imovel.js'
import { CAMPOS_POR_ABA } from '../lib/imovelCampos.js'
import { precosDoImovel } from '../lib/format.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import CampoImovel, { BotaoMapa } from './CampoImovel.jsx'
import StatusImovel from './StatusImovel.jsx'
import CompartilharFicha from './CompartilharFicha.jsx'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

// Visualização do imóvel em abas (as mesmas do formulário). Cada campo tem um lápis para editar
// só aquele campo; o botão "Editar" abre o formulário completo.
export default function ImovelDetalhes({ imovel, corretores, existentes = [], somenteLeitura = false, aba, onAba, onFechar, onEditar, onAtualizado }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [atual, setAtual] = useState(0) // foto exibida na galeria
  const [editando, setEditando] = useState(null) // id do campo em edição
  const [trocouAba, setTrocouAba] = useState(false) // liga o fade entre abas depois da primeira troca
  const [compartilhando, setCompartilhando] = useState(false)
  const corretorNome = corretores?.find((c) => c.id === imovel.corretor_id)?.nome ?? ''
  const fotos = imovel.fotos ?? []
  const total = fotos.length
  const precos = precosDoImovel(imovel)

  const mudarAba = (id) => {
    setEditando(null)
    onAba(id)
  }
  const irFoto = (passo) => setAtual((f) => (f + passo + total) % total)

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
          </span>
        </div>

        <StatusImovel imovel={imovel} somenteLeitura={somenteLeitura} onAtualizado={onAtualizado} />

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
              <div className="galeria-principal">
                {total > 0 ? (
                  <img src={fotos[atual] ?? fotos[0]} alt={`${imovel.titulo}, foto ${atual + 1}`} />
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
                      <img src={url} alt="" loading="lazy" />
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
          </section>
        ))}
      </div>
    </div>
    {compartilhando && <CompartilharFicha imovel={imovel} corretor={corretorNome} onFechar={() => setCompartilhando(false)} />}
    </>
  )
}
