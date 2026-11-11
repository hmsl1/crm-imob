import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { digitosWhatsapp, linkWhatsapp, telefoneExibicao } from '../lib/format.js'
import { validarWhatsapp } from '../lib/configuracoes.js'
import { useContatoSite } from '../lib/useContatoSite.js'
import LayoutPublico from './LayoutPublico.jsx'

const VAZIO = { nome: '', telefone: '', email: '', mensagem: '' }

// Página "Contato": fala com a equipe (WhatsApp/e-mail) e um formulário de contato geral
// ("o que você procura"), diferente do pop-up "Anuncie seu imóvel" (que é para quem quer vender/alugar).
export default function Contato({ navegar }) {
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const contato = useContatoSite()

  const marca = (campo) => ({ value: form[campo], onChange: (e) => setForm((f) => ({ ...f, [campo]: e.target.value })) })

  async function enviar(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErro('Informe seu nome.')
    const erroTelefone = validarWhatsapp(form.telefone)
    if (erroTelefone) return setErro(erroTelefone)

    setErro('')
    setEnviando(true)
    const { error } = await supabase.from('contatos_recebidos').insert({
      nome: form.nome.trim(),
      telefone: digitosWhatsapp(form.telefone),
      email: form.email.trim() || null,
      mensagem: form.mensagem.trim() || null,
    })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar agora. Tente novamente em instantes.')
    setEnviado(true)
    setForm(VAZIO)
  }

  return (
    <LayoutPublico navegar={navegar} paginaAtiva="contato">
      <section className="pagina-contato">
        <h1>Fale conosco</h1>

        <div className="contato-grade">
          <div className="contato-cartoes">
            {contato?.whatsapp && (
              <a className="contato-cartao" href={linkWhatsapp(contato.whatsapp, 'Olá, gostaria de mais informações')} target="_blank" rel="noreferrer">
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58ZM12.06 18.4h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.6 6.6 0 1 1 5.6 3.09Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.14-.43.05a5.4 5.4 0 0 1-1.58-.98 5.9 5.9 0 0 1-1.1-1.37c-.11-.2 0-.3.1-.4.1-.1.2-.23.3-.35.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.38-.33-.33-.44-.34h-.38c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.65 0 .97.72 1.92.82 2.05.1.13 1.4 2.14 3.39 3 .47.2.84.33 1.13.42.47.15.9.13 1.24.08.38-.06 1.17-.48 1.34-.95.17-.46.17-.86.12-.95-.05-.08-.18-.14-.38-.24Z" /></svg>
                </span>
                <span>
                  <span className="rotulo">Telefone / WhatsApp</span>
                  <strong>{telefoneExibicao(contato.whatsapp)}</strong>
                </span>
              </a>
            )}
            {contato?.instagram_handle && (
              <a
                className="contato-cartao"
                href={`https://instagram.com/${contato.instagram_handle.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.43.4.57.21 1 .48 1.44.92.44.44.71.87.92 1.44.17.46.36 1.26.4 2.43.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.4 2.43a3.9 3.9 0 0 1-.92 1.44 3.9 3.9 0 0 1-1.44.92c-.46.17-1.26.36-2.43.4-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.43-.4a3.9 3.9 0 0 1-1.44-.92 3.9 3.9 0 0 1-.92-1.44c-.17-.46-.36-1.26-.4-2.43C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.97.4-2.43.21-.57.48-1 .92-1.44.44-.44.87-.71 1.44-.92.46-.17 1.26-.36 2.43-.4C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.5.01-4.74.07-.96.04-1.48.2-1.83.34-.46.18-.78.39-1.13.74-.35.35-.56.67-.74 1.13-.14.35-.3.87-.34 1.83C3.16 8.46 3.14 8.86 3.14 12s.02 3.54.08 4.74c.04.96.2 1.48.34 1.83.18.46.39.78.74 1.13.35.35.67.56 1.13.74.35.14.87.3 1.83.34 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.96-.04 1.48-.2 1.83-.34.46-.18.78-.39 1.13-.74.35-.35.56-.67.74-1.13.14-.35.3-.87.34-1.83.06-1.2.07-1.6.07-4.74s-.01-3.54-.07-4.74c-.04-.96-.2-1.48-.34-1.83a2.1 2.1 0 0 0-.74-1.13 2.1 2.1 0 0 0-1.13-.74c-.35-.14-.87-.3-1.83-.34C15.54 4.01 15.14 4 12 4Zm0 3.38a4.62 4.62 0 1 1 0 9.24 4.62 4.62 0 0 1 0-9.24Zm0 1.8a2.82 2.82 0 1 0 0 5.64 2.82 2.82 0 0 0 0-5.64Zm4.8-1.98a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16Z" /></svg>
                </span>
                <span>
                  <span className="rotulo">Instagram</span>
                  <strong>@{contato.instagram_handle.replace(/^@/, '')}</strong>
                </span>
              </a>
            )}
            {(contato?.nome_responsavel || contato?.creci) && (
              <div className="contato-cartao">
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-9 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm4 9H7v-.7c0-1.33 2.67-2.3 4-2.3s4 .97 4 2.3V17Zm5-5h-3v-1.5h3V12Zm0-3h-3V7.5h3V9Z" /></svg>
                </span>
                <span>
                  <span className="rotulo">Responsável</span>
                  <strong>
                    {contato?.nome_responsavel}
                    {contato?.nome_responsavel && contato?.creci ? ' · ' : ''}
                    {contato?.creci && `CRECI ${contato.creci}`}
                  </strong>
                </span>
              </div>
            )}
            {contato?.email_contato && (
              <a className="contato-cartao" href={`mailto:${contato.email_contato}`}>
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5Z" /></svg>
                </span>
                <span>
                  <span className="rotulo">E-mail</span>
                  <strong>{contato.email_contato}</strong>
                </span>
              </a>
            )}
          </div>

          <form className="form-contato" onSubmit={enviar} noValidate>
            <h2>Envie sua mensagem</h2>
            <label>
              Nome
              <input type="text" required {...marca('nome')} />
            </label>
            <div className="duas">
              <label>
                Telefone com DDD
                <input type="tel" required placeholder="(22) 99999-9999" {...marca('telefone')} />
              </label>
              <label>
                E-mail (opcional)
                <input type="email" {...marca('email')} />
              </label>
            </div>
            <label>
              O que você procura (opcional)
              <textarea rows={3} {...marca('mensagem')} />
            </label>

            {erro && <p className="erro">{erro}</p>}
            {enviado && <p className="aviso">Recebemos sua mensagem. Entraremos em contato em breve!</p>}

            <div className="acoes">
              <span className="espaco" />
              <button type="submit" className="primario" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar contato'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </LayoutPublico>
  )
}
