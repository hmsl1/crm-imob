// Captação rápida: cadastro de um imóvel visto na rua (foto, localização e telefone do proprietário)
// para completar depois. Funções puras.
import { hojeISO } from './datas.js'

export const TIPOS_CAPTACAO = [
  { id: 'casa', rotulo: 'Casa' },
  { id: 'apartamento', rotulo: 'Apartamento' },
  { id: 'terreno', rotulo: 'Terreno' },
  { id: 'comercial', rotulo: 'Comercial' },
]

export const FORM_CAPTACAO_VAZIO = {
  tipo: 'casa',
  telefone: '',
  nome: '',
  endereco: '',
  bairro: '',
  observacao: '',
  latitude: null,
  longitude: null,
}

const texto = (v) => String(v ?? '').replace(/\s+/g, ' ').trim() || null
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')

export const temLocalizacao = (f) => f.latitude != null && f.longitude != null

// Pelo menos 8 dígitos no telefone, e alguma pista de onde fica o imóvel (foto, endereço ou localização)
export function validarCaptacao(f, fotos = []) {
  if (soDigitos(f.telefone).length < 8) return 'Informe o telefone do proprietário (o da placa ou o que você conseguiu).'
  if (fotos.length === 0 && !texto(f.endereco) && !temLocalizacao(f)) return 'Tire uma foto, informe o endereço ou use a sua localização.'
  return null
}

export function tituloDaCaptacao(f, hoje = hojeISO()) {
  const local = texto(f.endereco) ?? texto(f.bairro)
  const [a, m, d] = hoje.split('-')
  return `Visto na rua — ${local ?? `${d}/${m}/${a}`}`
}

// Linha a gravar em "imoveis". O proprietário é criado/vinculado pelo gatilho do banco (nome + telefone).
export function payloadDaCaptacao(f, fotos, { captadorId = null, hoje = hojeISO() } = {}) {
  const telefone = texto(f.telefone)
  return {
    titulo: tituloDaCaptacao(f, hoje),
    tipo: f.tipo,
    finalidade: 'venda',
    status: 'disponivel',
    captador_id: captadorId,
    captado_em: hoje,
    endereco: texto(f.endereco),
    bairro: texto(f.bairro),
    latitude: temLocalizacao(f) ? Number(Number(f.latitude).toFixed(6)) : null,
    longitude: temLocalizacao(f) ? Number(Number(f.longitude).toFixed(6)) : null,
    comentarios: texto(f.observacao),
    fotos,
    proprietario_nome: texto(f.nome) ?? `Proprietário ${telefone}`,
    proprietario_telefone1: telefone,
    a_completar: true,
  }
}

// Mensagem amigável para os erros do GPS do navegador
export function erroDeLocalizacao(codigo) {
  if (codigo === 1) return 'Permissão de localização negada. Libere o acesso no navegador ou informe o endereço.'
  if (codigo === 3) return 'Não foi possível obter a localização a tempo. Tente de novo ao ar livre.'
  return 'Não foi possível obter a sua localização.'
}
