// Registro dos campos do imóvel para a tela de detalhes: o que mostrar, em qual aba, e como
// editar cada campo individualmente. Funções puras (sem React nem Supabase), fáceis de testar.
import { moeda } from './format.js'
import {
  TIPOS_IMOVEL,
  FINALIDADES,
  STATUS_IMOVEL,
  PADROES,
  ESTADOS_IMOVEL,
  POSICOES,
  POSICOES_SOLAR,
  GRUPOS_CARACTERISTICAS,
  PISOS,
  temVenda,
  temAluguel,
  formDoImovel,
  payloadDoForm,
  validarEdicao,
} from './imovel.js'

// "chaves" = colunas do banco que o campo altera ao ser salvo (alguns campos mexem em mais de uma)
const campo = (id, rotulo, tipo, extra = {}) => ({ id, rotulo, tipo, chaves: [id], ...extra })

const SELECT_OPCIONAL = { permiteVazio: true }

const grupos = GRUPOS_CARACTERISTICAS.map((g) => ({
  id: 'grupo_' + g.id,
  rotulo: g.titulo,
  tipo: 'grupo',
  chaves: ['caracteristicas'],
  itens: g.itens,
}))
const grupoPisos = { id: 'grupo_pisos', rotulo: 'Tipo de piso', tipo: 'grupo', chaves: ['pisos'], itens: PISOS }

// Aba "fotos": a galeria é tratada à parte; aqui ficam os comentários
export const CAMPOS_POR_ABA = {
  principal: [
    {
      id: 'proprietario',
      titulo: 'Proprietário',
      campos: [
        campo('proprietario_nome', 'Nome do proprietário', 'texto'),
        campo('proprietario_telefone1', 'Telefone 1', 'telefone'),
        campo('proprietario_telefone2', 'Telefone 2', 'telefone'),
      ],
    },
    {
      id: 'imovel',
      titulo: 'Imóvel',
      campos: [
        campo('titulo', 'Título', 'texto'),
        campo('tipo', 'Tipo', 'select', { opcoes: TIPOS_IMOVEL }),
        // mudar a finalidade pode exigir/descartar valores, por isso edita os três juntos
        campo('finalidade', 'Finalidade', 'finalidade', { chaves: ['finalidade', 'valor_venda', 'valor_aluguel'] }),
        campo('status', 'Disponibilidade', 'select', { opcoes: STATUS_IMOVEL }),
        campo('bairro', 'Bairro', 'texto'),
        campo('cidade', 'Cidade', 'texto'),
        campo('corretor_id', 'Corretor responsável', 'corretor'),
      ],
    },
    {
      id: 'valores',
      titulo: 'Valores e condições',
      campos: [
        campo('valor_venda', 'Valor de venda', 'moeda', { visivel: (i) => temVenda(i.finalidade) }),
        campo('valor_aluguel', 'Valor do aluguel', 'moeda', { sufixo: ' /mês', visivel: (i) => temAluguel(i.finalidade) }),
        campo('condominio', 'Condomínio', 'condominio', { chaves: ['sem_condominio', 'valor_condominio'] }),
        campo('valor_iptu', 'IPTU', 'moeda'),
        campo('padrao', 'Padrão do imóvel', 'select', { opcoes: PADROES, ...SELECT_OPCIONAL }),
        campo('aceita_financiamento', 'Aceita financiamento', 'simnao'),
        campo('exclusividade', 'Exclusividade', 'simnao'),
        campo('chave_com_proprietario', 'Chave com o proprietário', 'bool'),
      ],
    },
  ],
  detalhes: [
    {
      id: 'situacao',
      titulo: 'Situação e posição',
      campos: [
        campo('estado_imovel', 'Situação do imóvel', 'select', { opcoes: ESTADOS_IMOVEL, ...SELECT_OPCIONAL }),
        campo('posicao', 'Posição', 'select', { opcoes: POSICOES, ...SELECT_OPCIONAL }),
        campo('posicao_solar', 'Posição solar', 'select', { opcoes: POSICOES_SOLAR, ...SELECT_OPCIONAL }),
        campo('vista_mar', 'Vista mar', 'simnao'),
      ],
    },
    {
      id: 'areas',
      titulo: 'Áreas',
      campos: [
        campo('area_terreno', 'Área do terreno', 'm2'),
        campo('area_construida', 'Área construída', 'm2'),
      ],
    },
    {
      id: 'comodos',
      titulo: 'Cômodos e vagas',
      campos: [
        campo('dormitorios', 'Dormitórios', 'qtd'),
        campo('suites', 'Suítes', 'qtd'),
        campo('banheiros', 'Banheiros', 'qtd'),
        campo('salas', 'Salas', 'qtd'),
        campo('vagas_cobertas', 'Vagas cobertas', 'qtd'),
        campo('vagas_descobertas', 'Vagas descobertas', 'qtd'),
      ],
    },
    {
      id: 'predio',
      titulo: 'Prédio',
      campos: [campo('elevador', 'Elevador', 'elevador', { chaves: ['elevador', 'andares_predio', 'andar_imovel'] })],
    },
  ],
  caracteristicas: [{ id: 'caracteristicas', titulo: 'Características do imóvel', campos: [...grupos, grupoPisos] }],
  fotos: [{ id: 'comentarios', titulo: 'Comentários', campos: [campo('comentarios', 'Comentários', 'textarea')] }],
}

// ---------------------------------------------------------------
// Exibição
// ---------------------------------------------------------------
const vazio = (v) => v === null || v === undefined || v === ''
const rotuloDe = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

// Texto a mostrar para o campo, ou null quando não foi informado
export function exibirCampo(c, i, ctx = {}) {
  const v = i[c.id]
  switch (c.tipo) {
    case 'texto':
    case 'telefone':
    case 'textarea':
    case 'qtd':
      return vazio(v) ? null : String(v)
    case 'moeda':
      return vazio(v) ? null : moeda(v) + (c.sufixo ?? '')
    case 'm2':
      return vazio(v) ? null : `${Number(v)} m²`
    case 'select':
      return vazio(v) ? null : rotuloDe(c.opcoes, v)
    case 'simnao':
      return vazio(v) ? null : v ? 'Sim' : 'Não'
    case 'bool':
      return v ? 'Sim' : 'Não'
    case 'corretor':
      return ctx.corretores?.find((x) => x.id === i.corretor_id)?.nome ?? null
    case 'finalidade':
      return rotuloDe(FINALIDADES, i.finalidade)
    case 'condominio':
      if (i.sem_condominio) return 'Sem condomínio'
      return vazio(i.valor_condominio) ? null : `${moeda(i.valor_condominio)} /mês`
    case 'elevador': {
      if (!i.elevador) return 'Não'
      const partes = ['Sim']
      if (!vazio(i.andares_predio)) partes.push(`${i.andares_predio} andares`)
      if (!vazio(i.andar_imovel)) partes.push(i.andar_imovel === 0 ? 'imóvel no térreo' : `imóvel no ${i.andar_imovel}º andar`)
      return partes.join(' · ')
    }
    default:
      return null
  }
}

// Ids marcados dentro de um grupo de características (ou da lista de pisos)
export function marcadosDoGrupo(c, i) {
  const coluna = i[c.chaves[0]] ?? []
  return c.itens.filter((item) => coluna.includes(item.id)).map((item) => item.id)
}

// ---------------------------------------------------------------
// Edição de um campo
// ---------------------------------------------------------------

// Valores iniciais do editor (em formato de formulário: textos e booleanos)
export function rascunhoInicial(c, i) {
  if (c.tipo === 'grupo') return { selecionados: marcadosDoGrupo(c, i) }
  const form = formDoImovel(i)
  return Object.fromEntries(c.chaves.map((k) => [k, form[k]]))
}

// Aplica o rascunho ao imóvel, valida só o que foi mexido e devolve apenas as colunas a gravar.
// Reaproveita payloadDoForm, então número, Sim/Não e valores dependentes seguem as mesmas regras
// do formulário completo (ex.: "sem condomínio" zera o valor do condomínio).
export function calcularAtualizacao(c, i, rascunho) {
  const form = formDoImovel(i)

  if (c.tipo === 'grupo') {
    const coluna = c.chaves[0]
    const idsDoGrupo = c.itens.map((item) => item.id)
    form[coluna] = [...form[coluna].filter((id) => !idsDoGrupo.includes(id)), ...rascunho.selecionados]
  } else {
    Object.assign(form, rascunho)
  }

  const erro = validarEdicao(c.chaves, form)
  if (erro) return { erro }

  const payload = payloadDoForm(form)
  return { parcial: Object.fromEntries(c.chaves.map((k) => [k, payload[k]])) }
}
