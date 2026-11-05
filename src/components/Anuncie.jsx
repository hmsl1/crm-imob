import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TIPOS_IMOVEL } from '../lib/imovel.js'
import { digitosWhatsapp } from '../lib/format.js'
import { validarWhatsapp } from '../lib/configuracoes.js'
import { linkVitrine } from '../lib/rota.js'
import { SiteTopo, SiteRodape } from './SiteCabecalhoRodape.jsx'

const VAZIO = { nome: '', telefone: '', email: '', tipo_imovel: '', cidade: '', bairro: '', mensagem: '' }

// Página dedicada para o proprietário que quer anunciar um imóvel com a imobiliária.
export default function Anuncie({ navegar }) {
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
      email: form.email.trim() || null,
      tipo_imovel: form.tipo_imovel || null,
      cidade: form.cidade.trim() || null,
      bairro: form.bairro.trim() || null,
      mensagem: form.mensagem.trim() || null,
    })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar agora. Tente novamente em instantes.')
    setEnviado(true)
  }

  return (
    <div className="vitrine">
      <SiteTopo navegar={navegar} />

      <div className="pagina-anuncie">
        <h1>Anuncie seu imóvel</h1>
        <p className="suave">
          Tem um imóvel para vender ou alugar? Deixe seus dados que entramos em contato para conversar sobre o
          anúncio.
        </p>

        {enviado ? (
          <div className="vazio-grande">
            <p>Recebemos seus dados. Entraremos em contato em breve — obrigado!</p>
            <button className="primario" onClick={() => navegar(linkVitrine)}>
              Ver os imóveis disponíveis
            </button>
          </div>
        ) : (
          <form className="form-anuncie" onSubmit={enviar}>
            <label>
              Nome
              <input type="text" required {...marca('nome')} />
            </label>
            <label>
              WhatsApp
              <input type="tel" required placeholder="(22) 99999-9999" {...marca('telefone')} />
            </label>
            <label>
              E-mail (opcional)
              <input type="email" {...marca('email')} />
            </label>
            <label>
              Tipo do imóvel (opcional)
              <select {...marca('tipo_imovel')}>
                <option value="">Selecione</option>
                {TIPOS_IMOVEL.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cidade (opcional)
              <input type="text" {...marca('cidade')} />
            </label>
            <label>
              Bairro (opcional)
              <input type="text" {...marca('bairro')} />
            </label>
            <label>
              Conte um pouco sobre o imóvel (opcional)
              <textarea rows={4} {...marca('mensagem')} />
            </label>

            {erro && <p className="erro">{erro}</p>}

            <button type="submit" className="primario" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        )}
      </div>

      <SiteRodape />
    </div>
  )
}
