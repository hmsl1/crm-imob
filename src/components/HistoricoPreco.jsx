import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { linhasDoHistorico } from '../lib/precos.js'

// Linha do tempo das mudanças de valor do imóvel (gravadas pelo banco a cada alteração de preço)
export default function HistoricoPreco({ imovel }) {
  const [linhas, setLinhas] = useState(null) // null = carregando
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    supabase
      .from('imovel_precos')
      .select('*')
      .eq('imovel_id', imovel.id)
      .order('alterado_em', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        setErro(error ? error.message : '')
        setLinhas(data ?? [])
      })
    return () => {
      ativo = false
    }
    // recarrega quando o valor muda (edição pela tela)
  }, [imovel.id, imovel.valor_venda, imovel.valor_aluguel])

  const itens = linhasDoHistorico(linhas ?? [])
  return (
    <section className="secao" aria-label="Histórico de preço">
      <h3>Histórico de preço</h3>
      {erro && <p className="erro">{erro}</p>}
      {linhas && itens.length === 0 && !erro && <p className="suave">Nenhum valor registrado ainda.</p>}
      {itens.length > 0 && (
        <ol className="linha-do-tempo">
          {itens.map((i) => (
            <li key={i.id} className={i.reducao ? 'reducao' : ''}>
              <span className="quando">{new Date(i.quando).toLocaleDateString('pt-BR')}</span>
              <span className="o-que">
                <strong>{i.rotulo}</strong> · {i.acao}
              </span>
              <span className="valores">
                {i.de && <s>{i.de}</s>} {i.de && i.para && '→'} {i.para ?? 'sem valor'}
                {i.percentual && <em className={'variacao' + (i.reducao ? ' baixou' : '')}> {i.percentual}</em>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
