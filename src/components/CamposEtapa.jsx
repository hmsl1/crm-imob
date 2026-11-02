import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { MOTIVOS_PERDIDO, comissaoSugerida, hojeISO, PERCENTUAL_COMISSAO_VENDA } from '../lib/etapa.js'
import { TIPOS_FECHAMENTO, rotuloValorFechado } from '../lib/lead.js'
import { comCodigo } from '../lib/imovel.js'
import { moeda } from '../lib/format.js'
import Opcoes from './Opcoes.jsx'

// Campos que aparecem ao mover o lead para Perdido (motivo) ou Fechado (imóvel, valor, data e comissão).
// Usado dentro do cadastro do lead e na janela que abre ao arrastar o card no quadro.
export default function CamposEtapa({ status, form, onMudar, vinculados = [] }) {
  const [imoveis, setImoveis] = useState(null) // null = carregando
  useEffect(() => {
    if (status !== 'fechado') return
    let ativo = true
    supabase
      .from('imoveis')
      .select('id, codigo, titulo, bairro')
      .order('titulo')
      .then(({ data }) => ativo && setImoveis(data ?? []))
    return () => {
      ativo = false
    }
  }, [status])

  const campo = (nome) => ({ value: form[nome] ?? '', onChange: (e) => onMudar(nome, e.target.value) })

  if (status === 'perdido') {
    return (
      <div className="campos-etapa">
        <label>
          Motivo da perda *
          <select {...campo('perdido_motivo')}>
            <Opcoes lista={MOTIVOS_PERDIDO} vazio="Escolha o motivo…" />
          </select>
        </label>
        {form.perdido_motivo === 'outro' && (
          <label>
            Descreva o motivo *
            <input maxLength={300} {...campo('perdido_motivo_texto')} />
          </label>
        )}
      </div>
    )
  }

  if (status === 'fechado') {
    const sugestao = comissaoSugerida(form.valor_fechado, form.fechado_tipo)
    const ordenados = [...(imoveis ?? [])].sort((a, b) => Number(vinculados.includes(b.id)) - Number(vinculados.includes(a.id)))
    return (
      <div className="campos-etapa">
        <label>
          Imóvel do negócio *
          <select {...campo('fechado_imovel_id')} disabled={imoveis === null}>
            <option value="">{imoveis === null ? 'Carregando imóveis…' : 'Escolha o imóvel…'}</option>
            {ordenados.map((i) => (
              <option key={i.id} value={i.id}>
                {comCodigo(i)}
                {vinculados.includes(i.id) ? ' (vinculado ao lead)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="duas">
          <label>
            Tipo de negócio
            <select {...campo('fechado_tipo')}>
              <Opcoes lista={TIPOS_FECHAMENTO} />
            </select>
          </label>
          <label>
            Data do fechamento *
            <input type="date" max={hojeISO()} {...campo('fechado_em')} />
          </label>
        </div>
        <div className="duas">
          <label>
            {rotuloValorFechado(form.fechado_tipo).replace('Valor da', 'Valor final da').replace('Valor do', 'Valor final do')} *
            <input type="number" inputMode="decimal" min="0" step="0.01" {...campo('valor_fechado')} />
          </label>
          <label>
            Comissão estimada (R$) *
            <input type="number" inputMode="decimal" min="0" step="0.01" {...campo('comissao_estimada')} />
          </label>
        </div>
        {sugestao !== null && String(sugestao) !== String(form.comissao_estimada) && (
          <p className="sugestao-comissao">
            Sugestão: {moeda(sugestao)} ({form.fechado_tipo === 'aluguel' ? '1 aluguel' : `${PERCENTUAL_COMISSAO_VENDA}% do valor`}){' '}
            <button type="button" className="link" onClick={() => onMudar('comissao_estimada', String(sugestao))}>
              Usar
            </button>
          </p>
        )}
      </div>
    )
  }
  return null
}
