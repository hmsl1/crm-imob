// Regras e opções do cadastro de imóvel. Funções puras: não dependem do Supabase nem do React,
// por isso são fáceis de testar.

export const TIPOS_IMOVEL = [
  { id: 'apartamento', rotulo: 'Apartamento' },
  { id: 'casa', rotulo: 'Casa' },
  { id: 'terreno', rotulo: 'Terreno' },
  { id: 'comercial', rotulo: 'Comercial' },
  { id: 'rural', rotulo: 'Rural' },
  { id: 'outro', rotulo: 'Outro' },
]

export const FINALIDADES = [
  { id: 'venda', rotulo: 'Venda' },
  { id: 'aluguel', rotulo: 'Aluguel' },
  { id: 'venda_aluguel', rotulo: 'Venda e aluguel' },
]

// Disponibilidade comercial do imóvel (antes chamada de "situação")
export const STATUS_IMOVEL = [
  { id: 'disponivel', rotulo: 'Disponível' },
  { id: 'reservado', rotulo: 'Reservado' },
  { id: 'vendido', rotulo: 'Vendido/Alugado' },
]

export const PADROES = [
  { id: 'baixo', rotulo: 'Baixo' },
  { id: 'medio', rotulo: 'Médio' },
  { id: 'alto', rotulo: 'Alto' },
]

export const ESTADOS_IMOVEL = [
  { id: 'construcao', rotulo: 'Em construção' },
  { id: 'novo', rotulo: 'Novo' },
  { id: 'usado', rotulo: 'Usado' },
]

export const POSICOES = [
  { id: 'frente', rotulo: 'Frente' },
  { id: 'lateral', rotulo: 'Lateral' },
  { id: 'fundos', rotulo: 'Fundos' },
]

export const POSICOES_SOLAR = [
  { id: 'manha', rotulo: 'Sol da manhã' },
  { id: 'tarde', rotulo: 'Sol da tarde' },
]

// Itens de marcação, agrupados. Para incluir um item novo basta acrescentar aqui:
// ele é salvo na coluna "caracteristicas" (lista de ids), sem precisar de migração.
export const GRUPOS_CARACTERISTICAS = [
  {
    id: 'comodidades',
    titulo: 'Comodidades',
    itens: [
      { id: 'tv_cabo', rotulo: 'TV a cabo' },
      { id: 'ar_condicionado', rotulo: 'Ar-condicionado' },
      { id: 'alarme', rotulo: 'Alarme' },
      { id: 'portao_eletronico', rotulo: 'Portão eletrônico' },
      { id: 'interfone', rotulo: 'Interfone' },
      { id: 'lareira', rotulo: 'Lareira' },
      { id: 'pe_direito_duplo', rotulo: 'Pé-direito duplo' },
      { id: 'deposito', rotulo: 'Depósito' },
      { id: 'mezanino', rotulo: 'Mezanino' },
      { id: 'mobiliado', rotulo: 'Mobiliado' },
      { id: 'terraco', rotulo: 'Terraço' },
      { id: 'jardim_inverno', rotulo: 'Jardim de inverno' },
    ],
  },
  {
    id: 'ambientes',
    titulo: 'Ambientes',
    itens: [
      { id: 'cozinha', rotulo: 'Cozinha' },
      { id: 'copa', rotulo: 'Copa' },
      { id: 'lavabo', rotulo: 'Lavabo' },
      { id: 'sacada_varanda', rotulo: 'Sacada/varanda' },
      { id: 'escritorio', rotulo: 'Escritório' },
      { id: 'despensa', rotulo: 'Despensa' },
      { id: 'area_servico', rotulo: 'Área de serviço' },
      { id: 'dormitorio_empregada', rotulo: 'Dormitório de empregada' },
      { id: 'banheiro_empregada', rotulo: 'Banheiro de empregada' },
    ],
  },
  {
    id: 'lazer',
    titulo: 'Lazer e estrutura',
    itens: [
      { id: 'churrasqueira', rotulo: 'Churrasqueira' },
      { id: 'piscina', rotulo: 'Piscina' },
      { id: 'area_gourmet', rotulo: 'Área gourmet' },
      { id: 'cozinha_gourmet', rotulo: 'Cozinha gourmet' },
      { id: 'salao_festas', rotulo: 'Salão de festas' },
      { id: 'salao_jogos', rotulo: 'Salão de jogos' },
      { id: 'espaco_fitness', rotulo: 'Espaço fitness' },
      { id: 'espaco_kids', rotulo: 'Espaço kids' },
      { id: 'sauna', rotulo: 'Sauna' },
      { id: 'jacuzzi', rotulo: 'Jacuzzi' },
      { id: 'solarium', rotulo: 'Solarium' },
      { id: 'adega', rotulo: 'Adega' },
      { id: 'zelador', rotulo: 'Zelador' },
    ],
  },
]

// Tipos de piso, dos mais comuns para os menos comuns
export const PISOS = [
  { id: 'porcelanato', rotulo: 'Porcelanato' },
  { id: 'ceramica', rotulo: 'Cerâmica' },
  { id: 'laminado', rotulo: 'Laminado' },
  { id: 'vinilico', rotulo: 'Vinílico' },
  { id: 'madeira', rotulo: 'Madeira / tábua corrida' },
  { id: 'taco', rotulo: 'Taco' },
  { id: 'granito', rotulo: 'Granito' },
  { id: 'marmore', rotulo: 'Mármore' },
  { id: 'cimento_queimado', rotulo: 'Cimento queimado' },
  { id: 'concreto_polido', rotulo: 'Concreto polido' },
  { id: 'carpete', rotulo: 'Carpete' },
  { id: 'pedra_sao_tome', rotulo: 'Pedra São Tomé' },
  { id: 'ardosia', rotulo: 'Ardósia' },
  { id: 'pedra_portuguesa', rotulo: 'Pedra portuguesa' },
  { id: 'travertino', rotulo: 'Travertino' },
  { id: 'ladrilho_hidraulico', rotulo: 'Ladrilho hidráulico' },
  { id: 'mosaico', rotulo: 'Mosaico' },
  { id: 'epoxi', rotulo: 'Epóxi' },
  { id: 'bambu', rotulo: 'Bambu' },
  { id: 'outro', rotulo: 'Outro' },
]

export const temVenda = (finalidade) => finalidade === 'venda' || finalidade === 'venda_aluguel'
export const temAluguel = (finalidade) => finalidade === 'aluguel' || finalidade === 'venda_aluguel'

// Filtro "Venda" também mostra os imóveis de "Venda e aluguel", e o mesmo vale para "Aluguel"
export function atendeFinalidade(finalidadeDoImovel, filtro) {
  if (!filtro) return true
  if (filtro === 'venda') return temVenda(finalidadeDoImovel)
  if (filtro === 'aluguel') return temAluguel(finalidadeDoImovel)
  return finalidadeDoImovel === filtro
}

// ---------------------------------------------------------------
// Formulário <-> banco
// ---------------------------------------------------------------

// Campos Sim/Não opcionais: no banco são boolean (ou nulo = não informado); no formulário, '' | 'sim' | 'nao'
const CAMPOS_SIMNAO = ['exclusividade', 'aceita_financiamento', 'vista_mar']

export const FORM_VAZIO = {
  proprietario_nome: '',
  proprietario_telefone1: '',
  proprietario_telefone2: '',

  titulo: '',
  tipo: 'apartamento',
  finalidade: 'venda',
  status: 'disponivel',
  corretor_id: '',
  endereco: '',
  bairro: '',
  cidade: '',

  valor_venda: '',
  valor_aluguel: '',
  valor_condominio: '',
  valor_iptu: '',
  sem_condominio: false,
  padrao: '',
  aceita_financiamento: '',
  exclusividade: '',
  chave_com_proprietario: false,

  estado_imovel: '',
  posicao: '',
  posicao_solar: '',
  vista_mar: '',
  area_terreno: '',
  area_construida: '',
  dormitorios: '',
  suites: '',
  banheiros: '',
  salas: '',
  vagas_cobertas: '',
  vagas_descobertas: '',
  elevador: false,
  andares_predio: '',
  andar_imovel: '',

  caracteristicas: [],
  pisos: [],
  comentarios: '',
}

export function formDoImovel(imovel) {
  const form = structuredClone(FORM_VAZIO)
  if (!imovel) return form
  for (const chave of Object.keys(form)) {
    const valor = imovel[chave]
    if (valor === null || valor === undefined) continue
    form[chave] = CAMPOS_SIMNAO.includes(chave) ? (valor ? 'sim' : 'nao') : valor
  }
  return form
}

const numero = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
const texto = (v) => String(v ?? '').trim() || null
const simNao = (v) => (v === 'sim' ? true : v === 'nao' ? false : null)

export function tituloAutomatico(form) {
  const tipo = TIPOS_IMOVEL.find((t) => t.id === form.tipo)?.rotulo ?? 'Imóvel'
  const local = texto(form.bairro) ?? texto(form.cidade)
  return local ? `${tipo} em ${local}` : tipo
}

// Converte o formulário no objeto gravado no banco (sem as fotos, que o modal acrescenta)
export function payloadDoForm(f) {
  return {
    proprietario_nome: texto(f.proprietario_nome),
    proprietario_telefone1: texto(f.proprietario_telefone1),
    proprietario_telefone2: texto(f.proprietario_telefone2),

    titulo: texto(f.titulo) ?? tituloAutomatico(f),
    tipo: f.tipo,
    finalidade: f.finalidade,
    status: f.status,
    corretor_id: f.corretor_id || null,
    endereco: texto(f.endereco),
    bairro: texto(f.bairro),
    cidade: texto(f.cidade),

    // valor que não se aplica à finalidade escolhida é descartado
    valor_venda: temVenda(f.finalidade) ? numero(f.valor_venda) : null,
    valor_aluguel: temAluguel(f.finalidade) ? numero(f.valor_aluguel) : null,
    valor_condominio: f.sem_condominio ? null : numero(f.valor_condominio),
    valor_iptu: numero(f.valor_iptu),
    sem_condominio: f.sem_condominio,
    padrao: f.padrao || null,
    aceita_financiamento: simNao(f.aceita_financiamento),
    exclusividade: simNao(f.exclusividade),
    chave_com_proprietario: f.chave_com_proprietario,

    estado_imovel: f.estado_imovel || null,
    posicao: f.posicao || null,
    posicao_solar: f.posicao_solar || null,
    vista_mar: simNao(f.vista_mar),
    area_terreno: numero(f.area_terreno),
    area_construida: numero(f.area_construida),
    dormitorios: numero(f.dormitorios),
    suites: numero(f.suites),
    banheiros: numero(f.banheiros),
    salas: numero(f.salas),
    vagas_cobertas: numero(f.vagas_cobertas),
    vagas_descobertas: numero(f.vagas_descobertas),
    elevador: f.elevador,
    andares_predio: f.elevador ? numero(f.andares_predio) : null,
    andar_imovel: f.elevador ? numero(f.andar_imovel) : null,

    caracteristicas: f.caracteristicas,
    pisos: f.pisos,
    comentarios: texto(f.comentarios),
  }
}

const valorPositivo = (v) => v !== '' && v !== null && v !== undefined && Number(v) > 0

// Abas do formulário de edição e da tela de detalhes (as duas usam a mesma organização)
export const ABAS_IMOVEL = [
  { id: 'principal', rotulo: 'Proprietário e valores' },
  { id: 'detalhes', rotulo: 'Detalhes do imóvel' },
  { id: 'caracteristicas', rotulo: 'Características' },
  { id: 'fotos', rotulo: 'Fotos e comentários' },
]

// Regras de obrigatoriedade: nome do proprietário, ao menos um telefone e o(s) valor(es) da finalidade.
// "chaves" são os campos que afetam cada regra; servem para validar só o que foi editado.
const REGRAS = [
  {
    chaves: ['proprietario_nome'],
    ok: (f) => Boolean(texto(f.proprietario_nome)),
    mensagem: 'Informe o nome do proprietário.',
  },
  {
    chaves: ['proprietario_telefone1', 'proprietario_telefone2'],
    ok: (f) => Boolean(texto(f.proprietario_telefone1) || texto(f.proprietario_telefone2)),
    mensagem: 'Informe pelo menos um telefone do proprietário.',
  },
  {
    chaves: ['finalidade', 'valor_venda'],
    ok: (f) => !temVenda(f.finalidade) || valorPositivo(f.valor_venda),
    mensagem: 'Informe o valor de venda.',
  },
  {
    chaves: ['finalidade', 'valor_aluguel'],
    ok: (f) => !temAluguel(f.finalidade) || valorPositivo(f.valor_aluguel),
    mensagem: 'Informe o valor do aluguel.',
  },
]

// Valida o formulário inteiro. Devolve { aba, mensagem } do primeiro problema, ou null se estiver tudo certo.
export function validarImovel(f) {
  const falha = REGRAS.find((r) => !r.ok(f))
  return falha ? { aba: 'principal', mensagem: falha.mensagem } : null
}

// Valida só as regras ligadas aos campos editados. Assim um imóvel antigo, sem proprietário,
// não impede de alterar (por exemplo) o número de banheiros. Devolve a mensagem ou null.
export function validarEdicao(chaves, f) {
  const falha = REGRAS.find((r) => r.chaves.some((c) => chaves.includes(c)) && !r.ok(f))
  return falha ? falha.mensagem : null
}
