import { supabase } from './supabase.js'
import { MARCA } from '../config.js'

export const BUCKET = 'imoveis-fotos'
export const MAX_FOTOS = 40

// Carrega a logo uma única vez (fica em cache em memória pelo resto da sessão) para desenhar como
// marca d'água. Se não houver logo configurada, ou o arquivo não existir, segue sem marca d'água
// em vez de travar o envio da foto.
let logoPromise = null
function carregarLogo() {
  if (!MARCA.logo) return Promise.resolve(null)
  if (!logoPromise) {
    logoPromise = new Promise((ok) => {
      const img = new Image()
      img.onload = () => ok(img)
      img.onerror = () => ok(null)
      img.src = MARCA.logo
    })
  }
  return logoPromise
}

// Desenha a logo no canto inferior direito, semitransparente, em cima da foto já reduzida.
async function aplicarMarcaDagua(ctx, largura, altura) {
  const logo = await carregarLogo()
  if (!logo) return
  const diametro = Math.round(Math.min(largura, altura) * 0.22)
  const margem = Math.round(Math.min(largura, altura) * 0.035)
  ctx.save()
  ctx.globalAlpha = 0.82
  ctx.drawImage(logo, largura - diametro - margem, altura - diametro - margem, diametro, diametro)
  ctx.restore()
}

// Reduz a foto no navegador antes de enviar: o plano grátis tem 1 GB de Storage.
// Uma foto de celular (4–8 MB) vira ~200–400 KB. "marcaDagua: true" é usado nas fotos dos imóveis
// (protege contra cópia por outros sites); a imagem de capa do site, por exemplo, não usa isso.
export async function comprimirImagem(arquivo, { ladoMax = 1600, qualidade = 0.82, marcaDagua = false } = {}) {
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
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close?.()

  if (marcaDagua) await aplicarMarcaDagua(ctx, largura, altura)

  return new Promise((ok, falha) =>
    canvas.toBlob(
      (blob) => (blob ? ok(blob) : falha(new Error('não foi possível processar a imagem'))),
      'image/jpeg',
      qualidade
    )
  )
}

// Envia para <id do usuário>/<uuid>.jpg e devolve a URL pública
export async function enviarFoto(arquivo, donoId, opcoes) {
  const blob = await comprimirImagem(arquivo, opcoes)
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

// Nova lista com o item de "de" levado para a posição "para" (reordenar fotos). Não altera a original.
export function moverFoto(lista, de, para) {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) return lista
  const nova = [...lista]
  const [item] = nova.splice(de, 1)
  nova.splice(para, 0, item)
  return nova
}
