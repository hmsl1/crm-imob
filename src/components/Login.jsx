import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { traduzirErroAuth as traduzir } from '../lib/senha.js'
import Marca from './Marca.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState('entrar') // entrar | criar | recuperar
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setEnviando(true)

    if (modo === 'recuperar') {
      // o link do e-mail volta para este site; o endereço precisa estar em Authentication → URL Configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (error) setErro(traduzir(error.message))
      else setAviso('Se este e-mail tiver uma conta, enviamos um link para criar uma nova senha. Confira também o spam.')
    } else if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro(traduzir(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha })
      if (error) setErro(traduzir(error.message))
      else if (!data.session) setAviso('Conta criada. Confirme o e-mail enviado para poder entrar.')
    }
    setEnviando(false)
  }

  return (
    <div className="centro">
      <form className="cartao" onSubmit={enviar}>
        <Marca grande />
        <p className="sub">{modo === 'entrar' ? 'Entre na sua conta' : modo === 'criar' ? 'Crie sua conta' : 'Recuperar senha'}</p>

        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {modo !== 'recuperar' && (
          <label>
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
        )}

        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="aviso">{aviso}</p>}

        <button className="primario" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link por e-mail'}
        </button>

        {modo === 'entrar' && (
          <button type="button" className="link" onClick={() => (setModo('recuperar'), setErro(''), setAviso(''))}>
            Esqueci minha senha
          </button>
        )}

        <button
          type="button"
          className="link"
          onClick={() => (setModo(modo === 'entrar' ? 'criar' : 'entrar'), setErro(''), setAviso(''))}
        >
          {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : modo === 'criar' ? 'Já tenho conta' : 'Voltar para o login'}
        </button>
      </form>
    </div>
  )
}
