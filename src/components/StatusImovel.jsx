import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { STATUS_IMOVEL } from '../lib/imovel.js'

// Disponibilidade do imóvel na tela de detalhes: três botões, o atual fica preenchido.
// Um clique grava na hora (só a coluna "status"). Para quem não cadastrou o imóvel, só mostra o estado.
export default function StatusImovel({ imovel, somenteLeitura = false, onAtualizado }) {
  const [salvando, setSalvando] = useState('') // id do status sendo gravado
  const [erro, setErro] = useState('')

  async function escolher(id) {
    if (id === imovel.status || salvando) return
    setErro('')
    setSalvando(id)
    const { data, error } = await supabase.from('imoveis').update({ status: id }).eq('id', imovel.id).select().single()
    setSalvando('')
    if (error) setErro('Não foi possível alterar a disponibilidade: ' + error.message)
    else onAtualizado(data)
  }

  return (
    <div className="status-troca">
      <span className="status-troca-rotulo" id={'status-' + imovel.id}>
        Disponibilidade
      </span>
      <div className="status-botoes" role="group" aria-labelledby={'status-' + imovel.id}>
        {STATUS_IMOVEL.map((s) => {
          const atual = imovel.status === s.id
          if (somenteLeitura && !atual) return null
          return (
            <button
              key={s.id}
              type="button"
              className={'status-opcao status-imovel ' + s.id + (atual ? ' atual' : '')}
              aria-pressed={atual}
              disabled={somenteLeitura || Boolean(salvando)}
              onClick={() => escolher(s.id)}
            >
              {salvando === s.id ? 'Salvando…' : s.rotulo}
            </button>
          )
        })}
      </div>
      {erro && <p className="erro">{erro}</p>}
    </div>
  )
}
