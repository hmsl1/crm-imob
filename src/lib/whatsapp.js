// Partes do WhatsApp que dependem do navegador (abrir conversa e compartilhar fotos).
import { linkWhatsapp, linkWhatsappSemNumero } from './format.js'

export function abrirWhatsapp(telefone, texto) {
  const url = telefone ? linkWhatsapp(telefone, texto) : linkWhatsappSemNumero(texto)
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Celulares e navegadores modernos permitem compartilhar arquivos pela folha de compartilhamento
export function suportaCompartilharFotos() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
}

// Baixa as fotos (bucket público) como arquivos, prontas para anexar
export async function baixarFotos(urls, max = 5) {
  return Promise.all(
    urls.slice(0, max).map(async (url, idx) => {
      const resposta = await fetch(url)
      if (!resposta.ok) throw new Error('Não foi possível baixar uma das fotos.')
      const blob = await resposta.blob()
      return new File([blob], `foto-${idx + 1}.jpg`, { type: blob.type || 'image/jpeg' })
    })
  )
}

// Abre a folha de compartilhamento com as fotos anexadas. Devolve 'ok' | 'cancelado' | 'sem-suporte'
export async function compartilharComFotos({ titulo, texto, arquivos }) {
  if (!suportaCompartilharFotos() || !navigator.canShare({ files: arquivos })) return 'sem-suporte'
  try {
    await navigator.share({ title: titulo, text: texto, files: arquivos })
    return 'ok'
  } catch (erro) {
    if (erro?.name === 'AbortError') return 'cancelado'
    throw erro
  }
}
