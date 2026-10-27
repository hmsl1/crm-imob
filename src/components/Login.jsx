import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Marca from './Marca.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState('entrar') // entrar | criar
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setEnviando(true)

    if (modo === 'entrar') {
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
        <p className="sub">{modo === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta'}</p>

        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
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

        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="aviso">{aviso}</p>}

        <button className="primario" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}
        >
          {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  )
}

function traduzir(msg) {
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/password/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  return msg
}
