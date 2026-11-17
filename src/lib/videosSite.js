// Transforma o texto salvo em "videos_site" (uma URL do YouTube por linha) em ids prontos para embutir.
export function extrairIdYoutube(url) {
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/.exec(String(url ?? ''))
  return m ? m[1] : null
}

export function idsDeVideos(texto) {
  return String(texto ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(extrairIdYoutube)
    .filter(Boolean)
}
