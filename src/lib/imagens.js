import { supabase } from './supabase.js'

export const BUCKET = 'imoveis-fotos'
export const MAX_FOTOS = 12

// Reduz a foto no navegador antes de enviar: o plano grátis tem 1 GB de Storage.
// Uma foto de celular (4–8 MB) vira ~200–400 KB.
export async function comprimirImagem(arquivo, ladoMax = 1600, qualidade = 0.82) {
  let bitmap
  try {
    bitmap = await createImageBitmap(arquivo)
  } catch {
    throw new Error('formato não suportado. Use JPG, PNG ou WebP.')
  }
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close?.()

  return new Promise((ok, falha) =>
    canvas.toBlob(
      (blob) => (blob ? ok(blob) : falha(new Error('não foi possível processar a imagem'))),
      'image/jpeg',
      qualidade
    )
  )
}

// Envia para <id do usuário>/<uuid>.jpg e devolve a URL pública
export async function enviarFoto(arquivo, donoId) {
  const blob = await comprimirImagem(arquivo)
  const caminho = `${donoId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
}

// Extrai o caminho dentro do bucket a partir da URL pública
export function caminhoDaUrl(url) {
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i < 0) return null
  return decodeURIComponent(url.slice(i + marca.length).split('?')[0])
}

export async function apagarFotos(urls) {
  const caminhos = urls.map(caminhoDaUrl).filter(Boolean)
  if (caminhos.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(caminhos)
  if (error) throw error
}
