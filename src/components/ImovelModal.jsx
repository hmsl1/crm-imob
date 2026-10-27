import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  TIPOS_IMOVEL,
  FINALIDADES,
  STATUS_IMOVEL,
  PADROES,
  ESTADOS_IMOVEL,
  POSICOES,
  POSICOES_SOLAR,
  GRUPOS_CARACTERISTICAS,
  PISOS,
  ABAS_IMOVEL,
  temVenda,
  temAluguel,
  formDoImovel,
  payloadDoForm,
  validarImovel,
} from '../lib/imovel.js'
import { nomeDoEmail } from '../lib/format.js'
import { enviarFoto, apagarFotos, MAX_FOTOS } from '../lib/imagens.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import Opcoes from './Opcoes.jsx'

const NOVO_CORRETOR = '__novo__'


function SimNao({ rotulo, ...props }) {
  return (
    <label>
      {rotulo}
      <select {...props}>
        <option value="">Não informado</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </label>
  )
}

function GrupoChecks({ titulo, itens, marcados, onAlternar }) {
  return (
    <fieldset className="grupo">
      <legend>{titulo}</legend>
      <div className="grade-checks">
        {itens.map((item) => (
          <label key={item.id} className="check">
            <input type="checkbox" checked={marcados.includes(item.id)} onChange={() => onAlternar(item.id)} />
            {item.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function ImovelModal({ imovel, usuario, abaInicial, onFechar, onSalvo }) {
  const editando = Boolean(imovel)
  const [form, setForm] = useState(() => formDoImovel(imovel))
  const [aba, setAba] = useState(abaInicial ?? 'principal')
  const [corretores, setCorretores] = useState([])
  const [fotos, setFotos] = useState(imovel?.fotos ?? [])
  const [novas, setNovas] = useState([]) // enviadas nesta sessão e ainda não salvas
  const [enviando, setEnviando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const { saindo, fechar } = useFechamentoAnimado()

  // Props prontas para os campos (valor + onChange)
  const texto = (nome) => ({
    value: form[nome],
    onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  })
  const marca = (nome) => ({
    checked: form[nome],
    onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.checked })),
  })
  const alternar = (chave) => (id) =>
    setForm((f) => ({
      ...f,
      [chave]: f[chave].includes(id) ? f[chave].filter((x) => x !== id) : [...f[chave], id],
    }))

  // Corretores: carrega a lista; se a conta ainda não tem nenhum, cria o corretor do próprio usuário
  useEffect(() => {
    let ativo = true
    const consultar = () =>
      supabase
        .from('corretores')
        .select('*')
        .eq('ativo', true)
        .order('e_proprio', { ascending: false })
        .order('nome')

    async function carregar() {
      let { data, error } = await consultar()
      if (error) {
        if (ativo) setErro('Não foi possível carregar os corretores: ' + error.message)
        return
      }
      if (data.length === 0) {
        // se duas aberturas simultâneas tentarem criar, o índice único recusa a segunda; ignoramos
        await supabase
          .from('corretores')
          .insert({ nome: nomeDoEmail(usuario.email), email: usuario.email, e_proprio: true })
        ;({ data } = await consultar())
      }
      if (!ativo) return
      const lista = data ?? []
      setCorretores(lista)
      // padrão: o corretor do próprio usuário logado
      setForm((f) => (f.corretor_id ? f : { ...f, corretor_id: (lista.find((c) => c.e_proprio) ?? lista[0])?.id ?? '' }))
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [usuario.email])

  async function escolherCorretor(e) {
    const valor = e.target.value
    if (valor !== NOVO_CORRETOR) {
      setForm((f) => ({ ...f, corretor_id: valor }))
      return
    }
    const nome = window.prompt('Nome do novo corretor:')?.trim()
    if (!nome) return
    const { data, error } = await supabase.from('corretores').insert({ nome }).select().single()
    if (error) {
      setErro('Não foi possível adicionar o corretor: ' + error.message)
      return
    }
    setCorretores((lista) => [...lista, data])
    setForm((f) => ({ ...f, corretor_id: data.id }))
  }

  async function adicionarFotos(e) {
    const arquivos = [...e.target.files]
    e.target.value = ''
    if (arquivos.length === 0) return

    const vagas = MAX_FOTOS - fotos.length
    if (vagas <= 0) {
      setErro(`Limite de ${MAX_FOTOS} fotos por imóvel.`)
      return
    }

    setErro('')
    setEnviando(true)
    const urls = []
    const falhas = []
    for (const arquivo of arquivos.slice(0, vagas)) {
      try {
        urls.push(await enviarFoto(arquivo, usuario.id))
      } catch (err) {
        falhas.push(`${arquivo.name}: ${err.message}`)
      }
    }
    setFotos((f) => [...f, ...urls])
    setNovas((n) => [...n, ...urls])
    const avisos = [...falhas]
    if (arquivos.length > vagas) avisos.push(`Só cabem ${MAX_FOTOS} fotos; as extras foram ignoradas.`)
    if (avisos.length) setErro(avisos.join(' '))
    setEnviando(false)
  }

  function removerFoto(url) {
    setFotos((f) => f.filter((u) => u !== url))
    // foto enviada agora e descartada: some do Storage na hora.
    // Foto que já estava salva só é apagada quando o imóvel for salvo.
    if (novas.includes(url)) {
      setNovas((n) => n.filter((u) => u !== url))
      apagarFotos([url]).catch(() => {})
    }
  }

  function tornarCapa(url) {
    setFotos((f) => [url, ...f.filter((u) => u !== url)])
  }

  async function cancelar() {
    if (novas.length) await apagarFotos(novas).catch(() => {})
    fechar(onFechar)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    const problema = validarImovel(form)
    if (problema) {
      setAba(problema.aba)
      setErro(problema.mensagem)
      return
    }

    setSalvando(true)
    const payload = { ...payloadDoForm(form), fotos }
    const { error } = editando
      ? await supabase.from('imoveis').update(payload).eq('id', imovel.id)
      : await supabase.from('imoveis').insert(payload)
    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }

    const removidas = (imovel?.fotos ?? []).filter((u) => !fotos.includes(u))
    if (removidas.length) apagarFotos(removidas).catch(() => {})
    fechar(onSalvo)
  }

  async function excluir() {
    if (!window.confirm(`Excluir o imóvel "${imovel.titulo}"? As fotos também serão apagadas.`)) return
    const { error } = await supabase.from('imoveis').delete().eq('id', imovel.id)
    if (error) {
      setErro(error.message)
      return
    }
    if (imovel.fotos?.length) apagarFotos(imovel.fotos).catch(() => {})
    fechar(onSalvo)
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={cancelar}>
      <div className="modal largo" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{editando ? 'Editar imóvel' : 'Novo imóvel'}</h2>
          <button className="link" onClick={cancelar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="abas" role="tablist">
          {ABAS_IMOVEL.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              className={aba === a.id ? 'ativa' : ''}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {/* noValidate: a validação é feita em validarImovel(), que também leva você até a aba com o problema */}
        <form onSubmit={salvar} noValidate>
          {aba === 'principal' && (
            <>
              <section className="secao">
                <h3>Proprietário</h3>
                <label>
                  Nome do proprietário *
                  <input {...texto('proprietario_nome')} autoComplete="off" />
                </label>
                <div className="duas">
                  <label>
                    Telefone 1 *
                    <input type="tel" {...texto('proprietario_telefone1')} placeholder="(22) 99999-9999" />
                  </label>
                  <label>
                    Telefone 2
                    <input type="tel" {...texto('proprietario_telefone2')} />
                  </label>
                </div>
                <p className="dica">Informe pelo menos um telefone.</p>
              </section>

              <section className="secao">
                <h3>Imóvel</h3>
                <label>
                  Título
                  <input {...texto('titulo')} placeholder="Opcional. Se vazio, é gerado (ex.: Apartamento em Centro)" />
                </label>
                <div className="tres">
                  <label>
                    Tipo
                    <select {...texto('tipo')}>
                      <Opcoes lista={TIPOS_IMOVEL} />
                    </select>
                  </label>
                  <label>
                    Finalidade
                    <select {...texto('finalidade')}>
                      <Opcoes lista={FINALIDADES} />
                    </select>
                  </label>
                  <label>
                    Disponibilidade
                    <select {...texto('status')}>
                      <Opcoes lista={STATUS_IMOVEL} />
                    </select>
                  </label>
                </div>
                <div className="duas">
                  <label>
                    Bairro
                    <input {...texto('bairro')} />
                  </label>
                  <label>
                    Cidade
                    <input {...texto('cidade')} />
                  </label>
                </div>
                <label>
                  Corretor responsável
                  <select value={form.corretor_id} onChange={escolherCorretor}>
                    {corretores.length === 0 && <option value="">Carregando…</option>}
                    {corretores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.e_proprio ? ' (você)' : ''}
                      </option>
                    ))}
                    <option value={NOVO_CORRETOR}>+ Adicionar corretor…</option>
                  </select>
                </label>
              </section>

              <section className="secao">
                <h3>Valores e condições</h3>
                {(temVenda(form.finalidade) || temAluguel(form.finalidade)) && (
                  <div className="duas">
                    {temVenda(form.finalidade) && (
                      <label>
                        Valor de venda (R$) *
                        <input type="number" min="0" step="0.01" {...texto('valor_venda')} />
                      </label>
                    )}
                    {temAluguel(form.finalidade) && (
                      <label>
                        Valor do aluguel mensal (R$) *
                        <input type="number" min="0" step="0.01" {...texto('valor_aluguel')} />
                      </label>
                    )}
                  </div>
                )}
                <div className="duas">
                  <label>
                    Condomínio (R$/mês)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...texto('valor_condominio')}
                      disabled={form.sem_condominio}
                    />
                  </label>
                  <label>
                    IPTU (R$)
                    <input type="number" min="0" step="0.01" {...texto('valor_iptu')} />
                  </label>
                </div>
                <label className="check">
                  <input type="checkbox" {...marca('sem_condominio')} />
                  Imóvel sem condomínio
                </label>
                <div className="tres">
                  <label>
                    Padrão do imóvel
                    <select {...texto('padrao')}>
                      <Opcoes lista={PADROES} vazio="Não informado" />
                    </select>
                  </label>
                  <SimNao rotulo="Aceita financiamento" {...texto('aceita_financiamento')} />
                  <SimNao rotulo="Exclusividade" {...texto('exclusividade')} />
                </div>
                <label className="check">
                  <input type="checkbox" {...marca('chave_com_proprietario')} />
                  Chave com o proprietário
                </label>
              </section>
            </>
          )}

          {aba === 'detalhes' && (
            <>
              <section className="secao">
                <h3>Situação e posição</h3>
                <div className="quatro">
                  <label>
                    Situação do imóvel
                    <select {...texto('estado_imovel')}>
                      <Opcoes lista={ESTADOS_IMOVEL} vazio="Não informado" />
                    </select>
                  </label>
                  <label>
                    Posição
                    <select {...texto('posicao')}>
                      <Opcoes lista={POSICOES} vazio="Não informado" />
                    </select>
                  </label>
                  <label>
                    Posição solar
                    <select {...texto('posicao_solar')}>
                      <Opcoes lista={POSICOES_SOLAR} vazio="Não informado" />
                    </select>
                  </label>
                  <SimNao rotulo="Vista mar" {...texto('vista_mar')} />
                </div>
              </section>

              <section className="secao">
                <h3>Áreas</h3>
                <div className="duas">
                  <label>
                    Área do terreno (m²)
                    <input type="number" min="0" step="0.01" {...texto('area_terreno')} />
                  </label>
                  <label>
                    Área construída (m²)
                    <input type="number" min="0" step="0.01" {...texto('area_construida')} />
                  </label>
                </div>
              </section>

              <section className="secao">
                <h3>Cômodos e vagas</h3>
                <div className="tres">
                  <label>
                    Dormitórios
                    <input type="number" min="0" step="1" {...texto('dormitorios')} />
                  </label>
                  <label>
                    Suítes
                    <input type="number" min="0" step="1" {...texto('suites')} />
                  </label>
                  <label>
                    Banheiros
                    <input type="number" min="0" step="1" {...texto('banheiros')} />
                  </label>
                </div>
                <div className="tres">
                  <label>
                    Salas
                    <input type="number" min="0" step="1" {...texto('salas')} />
                  </label>
                  <label>
                    Vagas cobertas
                    <input type="number" min="0" step="1" {...texto('vagas_cobertas')} />
                  </label>
                  <label>
                    Vagas descobertas
                    <input type="number" min="0" step="1" {...texto('vagas_descobertas')} />
                  </label>
                </div>
              </section>

              <section className="secao">
                <h3>Prédio</h3>
                <label className="check">
                  <input type="checkbox" {...marca('elevador')} />
                  Elevador
                </label>
                {form.elevador && (
                  <div className="duas">
                    <label>
                      Nº de andares do prédio
                      <input type="number" min="0" step="1" {...texto('andares_predio')} />
                    </label>
                    <label>
                      Andar do imóvel
                      <input type="number" min="0" step="1" {...texto('andar_imovel')} />
                    </label>
                  </div>
                )}
              </section>
            </>
          )}

          {aba === 'caracteristicas' && (
            <>
              {GRUPOS_CARACTERISTICAS.map((grupo) => (
                <GrupoChecks
                  key={grupo.id}
                  titulo={grupo.titulo}
                  itens={grupo.itens}
                  marcados={form.caracteristicas}
                  onAlternar={alternar('caracteristicas')}
                />
              ))}
              <GrupoChecks
                titulo="Tipo de piso (marque todos que existem)"
                itens={PISOS}
                marcados={form.pisos}
                onAlternar={alternar('pisos')}
              />
            </>
          )}

          {aba === 'fotos' && (
            <>
              <div className="fotos">
                <span className="rotulo-fotos">
                  Fotos ({fotos.length}/{MAX_FOTOS}). A primeira é a capa
                </span>
                {fotos.length > 0 && (
                  <div className="fotos-grade">
                    {fotos.map((url, idx) => (
                      <div className="miniatura" key={url}>
                        <img src={url} alt={`Foto ${idx + 1}`} loading="lazy" />
                        {idx === 0 ? (
                          <span className="capa-selo">Capa</span>
                        ) : (
                          <button type="button" className="tornar-capa" onClick={() => tornarCapa(url)}>
                            Tornar capa
                          </button>
                        )}
                        <button
                          type="button"
                          className="remover"
                          onClick={() => removerFoto(url)}
                          aria-label={`Remover foto ${idx + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="botao-arquivo">
                  {enviando ? 'Enviando…' : '+ Adicionar fotos'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={enviando || fotos.length >= MAX_FOTOS}
                    onChange={adicionarFotos}
                  />
                </label>
              </div>

              <label>
                Comentários
                <textarea rows={6} {...texto('comentarios')} placeholder="Observações livres sobre o imóvel" />
              </label>
            </>
          )}

          {erro && <p className="erro">{erro}</p>}

          <div className="acoes">
            {editando && (
              <button type="button" className="perigo" onClick={excluir}>
                Excluir
              </button>
            )}
            <span className="espaco" />
            <button type="button" onClick={cancelar}>
              Cancelar
            </button>
            <button className="primario" disabled={salvando || enviando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
