import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { salvarNomeDoCorretor } from '../lib/corretor.js'
import { validarNovaSenha, traduzirErroAuth } from '../lib/senha.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

// "Meu perfil": define o nome do corretor desta conta
export default function PerfilModal({ usuario, nomeAtual, onFechar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const [nome, setNome] = useState(nomeAtual)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmacao: '' })
  const [erroSenha, setErroSenha] = useState('')
  const [avisoSenha, setAvisoSenha] = useState('')
  const [trocando, setTrocando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const r = await salvarNomeDoCorretor(usuario, nome)
    setSalvando(false)
    if (r.erro) setErro(r.erro)
    else fechar(onFechar)
  }

  // Alterar senha: confirma a senha atual (entrando de novo) e só então grava a nova
  async function trocarSenha(e) {
    e.preventDefault()
    setErroSenha('')
    setAvisoSenha('')
    if (!senha.atual) return setErroSenha('Informe a senha atual.')
    const problema = validarNovaSenha(senha.nova, senha.confirmacao, senha.atual)
    if (problema) return setErroSenha(problema)
    setTrocando(true)
    const { error: erroAtual } = await supabase.auth.signInWithPassword({ email: usuario.email, password: senha.atual })
    if (erroAtual) {
      setTrocando(false)
      return setErroSenha(/invalid login/i.test(erroAtual.message) ? 'A senha atual está incorreta.' : traduzirErroAuth(erroAtual.message))
    }
    const { error } = await supabase.auth.updateUser({ password: senha.nova })
    setTrocando(false)
    if (error) return setErroSenha(traduzirErroAuth(error.message))
    setSenha({ atual: '', nova: '', confirmacao: '' })
    setAvisoSenha('Senha alterada com sucesso.')
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Meu perfil" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Meu perfil</h2>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={salvar} noValidate>
          <label>
            Nome do corretor
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Marcos Almeida" autoFocus />
          </label>
          <p className="dica">É o nome que assina as mensagens de WhatsApp e aparece na ficha dos imóveis.</p>
          <label>
            E-mail de acesso
            <input value={usuario.email} disabled />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <div className="acoes">
            <span className="espaco" />
            <button type="button" onClick={() => fechar(onFechar)}>
              Cancelar
            </button>
            <button className="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>

        <form className="troca-senha" onSubmit={trocarSenha} noValidate>
          <h3>Alterar senha</h3>
          <label>
            Senha atual
            <input type="password" autoComplete="current-password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} />
          </label>
          <div className="duas">
            <label>
              Nova senha
              <input type="password" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />
            </label>
            <label>
              Repita a nova senha
              <input type="password" autoComplete="new-password" value={senha.confirmacao} onChange={(e) => setSenha({ ...senha, confirmacao: e.target.value })} />
            </label>
          </div>
          <p className="dica">Pelo menos 8 caracteres, com letras e números.</p>
          {erroSenha && <p className="erro">{erroSenha}</p>}
          {avisoSenha && <p className="aviso">{avisoSenha}</p>}
          <div className="acoes">
            <span className="espaco" />
            <button disabled={trocando}>{trocando ? 'Alterando…' : 'Alterar senha'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
