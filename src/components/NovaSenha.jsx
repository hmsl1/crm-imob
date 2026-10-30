import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { validarNovaSenha, traduzirErroAuth } from '../lib/senha.js'
import Marca from './Marca.jsx'

// Aberta pelo link "Esqueci minha senha" do e-mail: o Supabase já entrou na conta de forma temporária;
// aqui a pessoa escolhe a nova senha.
export default function NovaSenha({ onConcluido }) {
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const problema = validarNovaSenha(nova, confirmacao)
    if (problema) return setErro(problema)
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: nova })
    setEnviando(false)
    if (error) return setErro(traduzirErroAuth(error.message))
    // tira o "#access_token=…" do endereço
    window.history.replaceState(null, '', window.location.pathname)
    onConcluido()
  }

  return (
    <div className="centro">
      <form className="cartao" onSubmit={salvar} noValidate>
        <Marca grande />
        <p className="sub">Defina sua nova senha</p>
        <label>
          Nova senha
          <input type="password" autoComplete="new-password" autoFocus value={nova} onChange={(e) => setNova(e.target.value)} />
        </label>
        <label>
          Repita a nova senha
          <input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </label>
        <p className="dica">Pelo menos 8 caracteres, com letras e números.</p>
        {erro && <p className="erro">{erro}</p>}
        <button className="primario" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
