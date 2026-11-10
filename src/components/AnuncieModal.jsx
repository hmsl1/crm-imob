import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { digitosWhatsapp } from '../lib/format.js'
import { validarWhatsapp } from '../lib/configuracoes.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

const VAZIO = { nome: '', telefone: '', mensagem: '' }

// Pop-up "Anuncie seu imóvel": o proprietário deixa nome, telefone e (opcionalmente) um texto sobre
// o imóvel, para a imobiliária entrar em contato. Mesma tabela "anuncios_recebidos" de antes.
export default function AnuncieModal({ onFechar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const marca = (campo) => ({
    value: form[campo],
    onChange: (e) => setForm((f) => ({ ...f, [campo]: e.target.value })),
  })

  async function enviar(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErro('Informe seu nome.')
    const erroTelefone = validarWhatsapp(form.telefone)
    if (erroTelefone) return setErro(erroTelefone)

    setErro('')
    setEnviando(true)
    const { error } = await supabase.from('anuncios_recebidos').insert({
      nome: form.nome.trim(),
      telefone: digitosWhatsapp(form.telefone),
      mensagem: form.mensagem.trim() || null,
    })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar agora. Tente novamente em instantes.')
    setEnviado(true)
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal modal-anuncie" role="dialog" aria-modal="true" aria-label="Anuncie seu imóvel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Anuncie seu imóvel</h2>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>

        {enviado ? (
          <div className="vazio-grande">
            <p>Recebemos seus dados. Entraremos em contato em breve — obrigado!</p>
            <button className="primario" onClick={() => fechar(onFechar)}>
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <label>
              Nome
              <input type="text" required {...marca('nome')} />
            </label>
            <label>
              Telefone com DDD
              <input type="tel" required placeholder="(22) 99999-9999" {...marca('telefone')} />
            </label>
            <label>
              Sobre o imóvel (opcional)
              <textarea rows={3} {...marca('mensagem')} />
            </label>

            {erro && <p className="erro">{erro}</p>}

            <div className="acoes">
              <span className="espaco" />
              <button type="submit" className="primario" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Quero anunciar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
