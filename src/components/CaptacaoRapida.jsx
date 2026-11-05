import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { enviarFoto, apagarFotos, MAX_FOTOS } from '../lib/imagens.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'
import { FORM_CAPTACAO_VAZIO, TIPOS_CAPTACAO, validarCaptacao, payloadDaCaptacao, temLocalizacao, erroDeLocalizacao } from '../lib/captacao.js'
import { acharPorTelefone } from '../lib/proprietario.js'
import { linkMapa } from '../lib/mapa.js'
import Opcoes from './Opcoes.jsx'

// Imóvel visto na rua: foto, localização e telefone em poucos toques. O resto fica "a completar".
export default function CaptacaoRapida({ usuario, onFechar, onSalvo }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [form, setForm] = useState(FORM_CAPTACAO_VAZIO)
  const [fotos, setFotos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [localizando, setLocalizando] = useState(false)
  const [precisao, setPrecisao] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [captadorId, setCaptadorId] = useState(null)
  const [proprietarios, setProprietarios] = useState([])
  const salvou = useRef(false)

  useEffect(() => {
    let ativo = true
    supabase
      .from('corretores')
      .select('id')
      .eq('owner_id', usuario.id)
      .eq('e_proprio', true)
      .maybeSingle()
      .then(({ data }) => ativo && setCaptadorId(data?.id ?? null))
    supabase
      .from('proprietarios')
      .select('id, nome, telefone1, telefone2')
      .then(({ data }) => ativo && setProprietarios(data ?? []))
    return () => {
      ativo = false
    }
  }, [usuario.id])

  const mudar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const conhecido = acharPorTelefone(proprietarios, [form.telefone])[0]

  async function adicionarFotos(e) {
    const arquivos = [...e.target.files]
    e.target.value = ''
    const vagas = MAX_FOTOS - fotos.length
    if (arquivos.length === 0 || vagas <= 0) return
    setErro('')
    setEnviando(true)
    const urls = []
    for (const arquivo of arquivos.slice(0, vagas)) {
      try {
        urls.push(await enviarFoto(arquivo, usuario.id))
      } catch (err) {
        setErro(`${arquivo.name}: ${err.message}`)
      }
    }
    setFotos((f) => [...f, ...urls])
    setEnviando(false)
  }

  function removerFoto(url) {
    setFotos((f) => f.filter((u) => u !== url))
    apagarFotos([url]).catch(() => {})
  }

  function usarLocalizacao() {
    if (!navigator.geolocation) return setErro('Este navegador não consegue obter a localização.')
    setErro('')
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        setPrecisao(Math.round(pos.coords.accuracy))
        setLocalizando(false)
      },
      (e) => {
        setErro(erroDeLocalizacao(e.code))
        setLocalizando(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  async function cancelar() {
    if (fotos.length && !salvou.current) await apagarFotos(fotos).catch(() => {})
    fechar(onFechar)
  }

  async function salvar(e) {
    e.preventDefault()
    const problema = validarCaptacao(form, fotos)
    if (problema) return setErro(problema)
    setErro('')
    setSalvando(true)
    const { error } = await supabase.from('imoveis').insert(payloadDaCaptacao(form, fotos, { captadorId }))
    setSalvando(false)
    if (error) return setErro(error.message)
    salvou.current = true
    fechar(onSalvo)
  }

  const link = temLocalizacao(form) ? linkMapa(form) : null

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={cancelar}>
      <form className="modal captacao" role="dialog" aria-modal="true" aria-label="Captação rápida" onClick={(e) => e.stopPropagation()} onSubmit={salvar} noValidate>
        <div className="modal-topo">
          <div>
            <h2>Captação rápida</h2>
            <div className="subtitulo">Imóvel visto na rua: o resto você completa depois.</div>
          </div>
          <button type="button" className="link" onClick={cancelar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <section className="secao">
          <label className="botao-foto">
            <input type="file" accept="image/*" capture="environment" multiple onChange={adicionarFotos} aria-label="Tirar foto do imóvel" />
            <span className="botao-grande">{enviando ? 'Enviando…' : fotos.length ? '+ Outra foto' : '📷 Tirar foto'}</span>
          </label>
          {fotos.length > 0 && (
            <div className="miniaturas-captacao">
              {fotos.map((url) => (
                <span key={url} className="mini">
                  <img src={url} alt="" />
                  <button type="button" aria-label="Remover foto" onClick={() => removerFoto(url)}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="secao">
          <button type="button" className="botao-grande" onClick={usarLocalizacao} disabled={localizando}>
            {localizando ? 'Obtendo localização…' : temLocalizacao(form) ? '📍 Atualizar localização' : '📍 Usar minha localização'}
          </button>
          {temLocalizacao(form) && (
            <p className="dica" role="status">
              Localização salva{precisao != null ? ` (precisão de ~${precisao} m)` : ''}.{' '}
              {link && (
                <a href={link} target="_blank" rel="noreferrer">
                  Conferir no mapa
                </a>
              )}
            </p>
          )}
          <label>
            Endereço (se souber)
            <input value={form.endereco} onChange={mudar('endereco')} placeholder="Ex.: Rua das Flores, 123" autoComplete="off" />
          </label>
          <label>
            Bairro
            <input value={form.bairro} onChange={mudar('bairro')} />
          </label>
        </section>

        <section className="secao">
          <label>
            Telefone do proprietário *
            <input type="tel" inputMode="tel" value={form.telefone} onChange={mudar('telefone')} placeholder="(22) 99999-9999" />
          </label>
          {conhecido && (
            <p className="dica" role="status">
              Este telefone já é do proprietário <strong>{conhecido.nome}</strong>: o imóvel será vinculado a ele.
            </p>
          )}
          <label>
            Nome (se souber)
            <input value={form.nome} onChange={mudar('nome')} autoComplete="off" />
          </label>
          <div className="duas">
            <label>
              Tipo
              <select value={form.tipo} onChange={mudar('tipo')}>
                <Opcoes lista={TIPOS_CAPTACAO} />
              </select>
            </label>
          </div>
          <label>
            Observação
            <textarea rows={2} value={form.observacao} onChange={mudar('observacao')} placeholder="Ex.: placa 'Vende-se', portão azul" />
          </label>
        </section>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div className="acoes">
          <span className="espaco" />
          <button type="button" onClick={cancelar}>
            Cancelar
          </button>
          <button type="submit" className="primario" disabled={salvando || enviando}>
            {salvando ? 'Salvando…' : 'Salvar captação'}
          </button>
        </div>
      </form>
    </div>
  )
}
