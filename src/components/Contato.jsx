import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { digitosWhatsapp } from '../lib/format.js'
import { validarWhatsapp } from '../lib/configuracoes.js'
import LayoutPublico from './LayoutPublico.jsx'

const VAZIO = { nome: '', telefone: '', email: '', mensagem: '' }

// Página "Contato": fala com a equipe (WhatsApp/e-mail) e um formulário de contato geral
// ("o que você procura"), diferente do pop-up "Anuncie seu imóvel" (que é para quem quer vender/alugar).
export default function Contato({ navegar }) {
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

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

        <form className="form-contato" onSubmit={enviar} noValidate>
          <h2>Fale com a nossa equipe</h2>
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
      </section>
    </LayoutPublico>
  )
}
