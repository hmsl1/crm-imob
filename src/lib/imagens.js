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

// Desenha a logo centralizada e translúcida por cima da foto já reduzida.
async function aplicarMarcaDagua(ctx, largura, altura) {
  const logo = await carregarLogo()
  if (!logo) return
  const diametro = Math.round(Math.min(largura, altura) * 0.46)
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.drawImage(logo, (largura - diametro) / 2, (altura - diametro) / 2, diametro, diametro)
  ctx.restore()
}

function canvasParaBlob(canvas, tipo, qualidade) {
  return new Promise((ok) => canvas.toBlob((blob) => ok(blob), tipo, qualidade))
}

// Reduz a foto no navegador antes de enviar: converte para WebP (menor peso com ótima qualidade)
// com fallback automático para JPEG se o navegador não gerar WebP em canvas.
// "marcaDagua: true" é usado nas fotos dos imóveis (protege contra cópia por outros sites);
// a imagem de capa do site, por exemplo, não usa isso.
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

  const webp = await canvasParaBlob(canvas, 'image/webp', qualidade)
  if (webp && webp.type === 'image/webp') return webp

  const jpeg = await canvasParaBlob(canvas, 'image/jpeg', qualidade)
  if (jpeg) return jpeg
  throw new Error('não foi possível processar a imagem')
}

// Envia para <id do usuário>/<uuid>.webp (ou .jpg) e devolve a URL pública
export async function enviarFoto(arquivo, donoId, opcoes) {
  const blob = await comprimirImagem(arquivo, opcoes)
  const ehWebp = blob.type === 'image/webp'
  const ext = ehWebp ? 'webp' : 'jpg'
  const caminho = `${donoId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' })
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
