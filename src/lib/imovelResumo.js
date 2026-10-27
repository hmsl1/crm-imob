// Monta, a partir do registro do banco, os dados que a tela de detalhes (somente leitura) exibe.
// Só entram campos preenchidos: o que não foi informado simplesmente não aparece.
import { moeda } from './format.js'
import {
  PADROES,
  ESTADOS_IMOVEL,
  POSICOES,
  POSICOES_SOLAR,
  GRUPOS_CARACTERISTICAS,
  PISOS,
} from './imovel.js'

const rotuloDe = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id
const vazio = (v) => v === null || v === undefined || v === ''
const simNao = (b) => (vazio(b) ? null : b ? 'Sim' : 'Não')
const m2 = (v) => (vazio(v) ? null : `${Number(v)} m²`)
const qtd = (v) => (vazio(v) ? null : String(v))

function descreverElevador(i) {
  if (!i.elevador) return null
  const partes = ['Sim']
  if (!vazio(i.andares_predio)) partes.push(`${i.andares_predio} andares`)
  if (!vazio(i.andar_imovel)) partes.push(i.andar_imovel === 0 ? 'imóvel no térreo' : `imóvel no ${i.andar_imovel}º andar`)
  return partes.join(' · ')
}

export function resumoDoImovel(i, corretores = []) {
  const corretor = corretores.find((c) => c.id === i.corretor_id)?.nome ?? null

  const secoes = [
    {
      id: 'proprietario',
      titulo: 'Proprietário e corretor',
      itens: [
        { rotulo: 'Proprietário', valor: i.proprietario_nome },
        { rotulo: 'Telefone', valor: i.proprietario_telefone1, tipo: 'telefone' },
        { rotulo: 'Telefone 2', valor: i.proprietario_telefone2, tipo: 'telefone' },
        { rotulo: 'Corretor responsável', valor: corretor },
      ],
    },
    {
      id: 'valores',
      titulo: 'Valores e condições',
      itens: [
        {
          rotulo: 'Condomínio',
          valor: i.sem_condominio ? 'Sem condomínio' : vazio(i.valor_condominio) ? null : `${moeda(i.valor_condominio)} /mês`,
        },
        { rotulo: 'IPTU', valor: vazio(i.valor_iptu) ? null : moeda(i.valor_iptu) },
        { rotulo: 'Padrão do imóvel', valor: i.padrao ? rotuloDe(PADROES, i.padrao) : null },
        { rotulo: 'Aceita financiamento', valor: simNao(i.aceita_financiamento) },
        { rotulo: 'Exclusividade', valor: simNao(i.exclusividade) },
        { rotulo: 'Chave com o proprietário', valor: i.chave_com_proprietario ? 'Sim' : null },
      ],
    },
    {
      id: 'detalhes',
      titulo: 'Detalhes do imóvel',
      itens: [
        { rotulo: 'Situação do imóvel', valor: i.estado_imovel ? rotuloDe(ESTADOS_IMOVEL, i.estado_imovel) : null },
        { rotulo: 'Posição', valor: i.posicao ? rotuloDe(POSICOES, i.posicao) : null },
        { rotulo: 'Posição solar', valor: i.posicao_solar ? rotuloDe(POSICOES_SOLAR, i.posicao_solar) : null },
        { rotulo: 'Vista mar', valor: simNao(i.vista_mar) },
        { rotulo: 'Área do terreno', valor: m2(i.area_terreno) },
        { rotulo: 'Área construída', valor: m2(i.area_construida) },
        { rotulo: 'Dormitórios', valor: qtd(i.dormitorios) },
        { rotulo: 'Suítes', valor: qtd(i.suites) },
        { rotulo: 'Banheiros', valor: qtd(i.banheiros) },
        { rotulo: 'Salas', valor: qtd(i.salas) },
        { rotulo: 'Vagas cobertas', valor: qtd(i.vagas_cobertas) },
        { rotulo: 'Vagas descobertas', valor: qtd(i.vagas_descobertas) },
        { rotulo: 'Elevador', valor: descreverElevador(i) },
      ],
    },
  ]
    .map((s) => ({ ...s, itens: s.itens.filter((item) => !vazio(item.valor)) }))
    .filter((s) => s.itens.length > 0)

  const marcadas = i.caracteristicas ?? []
  const caracteristicas = GRUPOS_CARACTERISTICAS.map((g) => ({
    titulo: g.titulo,
    itens: g.itens.filter((item) => marcadas.includes(item.id)).map((item) => item.rotulo),
  }))
  const pisos = i.pisos ?? []
  caracteristicas.push({
    titulo: 'Tipo de piso',
    itens: PISOS.filter((p) => pisos.includes(p.id)).map((p) => p.rotulo),
  })

  return {
    secoes,
    caracteristicas: caracteristicas.filter((g) => g.itens.length > 0),
    comentarios: vazio(i.comentarios) ? null : i.comentarios,
  }
}
