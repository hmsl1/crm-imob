// Geração de mídia comercial do imóvel (sem dados do proprietário ou endereço interno):
// 1. Ficha em PDF pronta para impressão / salvar como PDF pelo navegador
// 2. Arte vertical 1080x1920 PNG pronta para Stories do Instagram / WhatsApp
import { MARCA } from '../config.js'
import { moeda, precosDoImovel } from './format.js'
import {
  TIPOS_IMOVEL,
  FINALIDADES,
  GRUPOS_CARACTERISTICAS,
  PISOS,
  sufixoIptu,
} from './imovel.js'

const rotulo = (lista, id) => lista.find((i) => i.id === id)?.rotulo ?? id

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function imprimirFichaPDF(imovel, { corretor = '' } = {}) {
  const win = window.open('', '_blank', 'width=920,height=720')
  if (!win) {
    throw new Error('O navegador bloqueou a janela de impressão. Libere os pop-ups para gerar o PDF.')
  }

  const precos = precosDoImovel(imovel)
  const fotos = (imovel.fotos ?? []).slice(0, 5)
  const logoUrl = MARCA.logo ? `${window.location.origin}${MARCA.logo}` : null
  const local = [rotulo(TIPOS_IMOVEL, imovel.tipo), imovel.nome_condominio, imovel.bairro, imovel.cidade]
    .filter(Boolean)
    .join(' · ')
  const totalVagas = (imovel.vagas_cobertas ?? 0) + (imovel.vagas_descobertas ?? 0)

  const specs = [
    imovel.area_construida != null && ['Área construída', `${Number(imovel.area_construida)} m²`],
    imovel.area_terreno != null && ['Área do terreno', `${Number(imovel.area_terreno)} m²`],
    imovel.dormitorios != null && ['Dormitórios', String(imovel.dormitorios)],
    imovel.suites != null && ['Suítes', String(imovel.suites)],
    imovel.banheiros != null && ['Banheiros', String(imovel.banheiros)],
    totalVagas > 0 && ['Vagas', String(totalVagas)],
    imovel.elevador && ['Elevador', 'Sim'],
    imovel.aceita_financiamento && ['Financiamento', 'Aceita'],
    !imovel.sem_condominio && imovel.valor_condominio != null && ['Condomínio', `${moeda(imovel.valor_condominio)} /mês`],
    !imovel.sem_iptu && imovel.valor_iptu != null && ['IPTU', moeda(imovel.valor_iptu) + sufixoIptu(imovel.iptu_periodo)],
  ].filter(Boolean)

  const itensCarac = GRUPOS_CARACTERISTICAS.flatMap((g) => g.itens)
    .filter((item) => (imovel.caracteristicas ?? []).includes(item.id))
    .map((item) => item.rotulo)
  const itensPiso = PISOS.filter((p) => (imovel.pisos ?? []).includes(p.id)).map((p) => p.rotulo)

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(imovel.codigo ? `${imovel.codigo} · ` : '')}${esc(imovel.titulo)} — ${esc(MARCA.nome)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 28px 34px; color: #243532; background: #fff;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, Segoe UI, sans-serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .topo { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5d3b9; padding-bottom: 14px; margin-bottom: 18px; }
    .topo img { height: 48px; max-width: 180px; object-fit: contain; }
    .topo-dir { text-align: right; font-size: 13px; color: #4b635f; }
    .codigo { display: inline-block; background: #f4ecdf; border: 1px solid #e5d3b9; color: #36504c; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em; }
    h1 { margin: 8px 0 4px; font-size: 24px; line-height: 1.2; }
    .sub { color: #4b635f; margin: 0 0 14px; font-size: 14px; }
    .precos { display: flex; gap: 20px; flex-wrap: wrap; background: #fbf7ef; border: 1px solid #e5d3b9; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
    .preco small { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b635f; }
    .preco strong { font-size: 22px; color: #243532; }
    .fotos { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 18px; }
    .fotos.uma { grid-template-columns: 1fr; }
    .fotos img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block; }
    .foto-capa { max-height: 290px; }
    .fotos-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 290px; }
    .fotos-mini img { height: 141px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #4b635f; margin: 18px 0 8px; border-bottom: 1px solid #e5d3b9; padding-bottom: 4px; }
    .specs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .spec { background: #fbf7ef; border: 1px solid #e5d3b9; border-radius: 8px; padding: 8px 10px; }
    .spec small { display: block; font-size: 11px; color: #4b635f; }
    .spec strong { font-size: 14px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: #f4ecdf; border: 1px solid #e5d3b9; border-radius: 999px; padding: 3px 10px; font-size: 12px; }
    .texto { white-space: pre-wrap; line-height: 1.5; font-size: 13px; }
    .rodape { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5d3b9; display: flex; justify-content: space-between; font-size: 12px; color: #4b635f; }
    @media print { body { padding: 12px 16px; } }
  </style>
</head>
<body>
  <div class="topo">
    <div>${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(MARCA.nome)}" />` : `<strong>${esc(MARCA.nome)}</strong>`}</div>
    <div class="topo-dir">
      <strong>${esc(MARCA.nome)}</strong><br />
      ${corretor ? `Atendimento: ${esc(corretor)}` : 'Ficha do Imóvel'}
    </div>
  </div>

  ${imovel.codigo ? `<span class="codigo">${esc(imovel.codigo)}</span>` : ''}
  <span class="codigo">${esc(rotulo(FINALIDADES, imovel.finalidade))}</span>
  <h1>${esc(imovel.titulo)}</h1>
  ${local ? `<p class="sub">${esc(local)}</p>` : ''}

  ${
    precos.length
      ? `<div class="precos">${precos
          .map((p) => `<div class="preco"><small>${esc(p.rotulo)}</small><strong>${esc(p.texto)}</strong></div>`)
          .join('')}</div>`
      : ''
  }

  ${
    fotos.length
      ? `<div class="fotos ${fotos.length === 1 ? 'uma' : ''}">
          <img class="foto-capa" src="${esc(fotos[0])}" alt="" />
          ${
            fotos.length > 1
              ? `<div class="fotos-mini">${fotos
                  .slice(1, 5)
                  .map((u) => `<img src="${esc(u)}" alt="" />`)
                  .join('')}</div>`
              : ''
          }
        </div>`
      : ''
  }

  ${
    specs.length
      ? `<h2>Detalhes do imóvel</h2>
         <div class="specs">${specs
           .map(([r, v]) => `<div class="spec"><small>${esc(r)}</small><strong>${esc(v)}</strong></div>`)
           .join('')}</div>`
      : ''
  }

  ${
    itensCarac.length
      ? `<h2>Características</h2><div class="chips">${itensCarac
          .map((c) => `<span class="chip">✓ ${esc(c)}</span>`)
          .join('')}</div>`
      : ''
  }

  ${
    itensPiso.length
      ? `<h2>Pisos</h2><div class="chips">${itensPiso
          .map((p) => `<span class="chip">${esc(p)}</span>`)
          .join('')}</div>`
      : ''
  }

  ${imovel.comentarios ? `<h2>Sobre o imóvel</h2><p class="texto">${esc(imovel.comentarios)}</p>` : ''}

  <div class="rodape">
    <span>${esc(MARCA.nome)} — Valores e disponibilidade sujeitos a alteração sem aviso prévio.</span>
    ${corretor ? `<span>Corretor: ${esc(corretor)}</span>` : ''}
  </div>
  <script>
    window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 300); };
  </script>
</body>
</html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
}

function carregarImagem(url, crossOrigin = true) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function retanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function quebrarLinhas(ctx, texto, maxLargura, maxLinhas) {
  const palavras = String(texto ?? '').split(/\s+/).filter(Boolean)
  const linhas = []
  let atual = ''
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(teste).width <= maxLargura) {
      atual = teste
    } else {
      if (atual) linhas.push(atual)
      atual = palavra
      if (linhas.length >= maxLinhas) break
    }
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual)
  return linhas.slice(0, maxLinhas)
}

export async function gerarImagemStory(imovel, { corretor = '' } = {}) {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fundo creme elegante da marca
  ctx.fillStyle = '#f4ecdf'
  ctx.fillRect(0, 0, W, H)

  // Faixa superior verde profundo
  ctx.fillStyle = '#243532'
  ctx.fillRect(0, 0, W, 240)

  const [fotoCapa, logo] = await Promise.all([
    carregarImagem(imovel.fotos?.[0], true),
    MARCA.logo ? carregarImagem(`${window.location.origin}${MARCA.logo}`, false) : Promise.resolve(null),
  ])

  // Logo ou nome no cabeçalho
  if (logo) {
    const proporcao = Math.min(280 / logo.width, 130 / logo.height)
    const lw = logo.width * proporcao
    const lh = logo.height * proporcao
    ctx.drawImage(logo, 72, 120 - lh / 2, lw, lh)
  } else {
    ctx.fillStyle = '#f4ecdf'
    ctx.font = '700 44px system-ui, sans-serif'
    ctx.fillText(MARCA.nome, 72, 135)
  }

  // Selo finalidade + código no topo direito
  const seloTexto = [imovel.codigo, rotulo(FINALIDADES, imovel.finalidade)].filter(Boolean).join(' · ')
  ctx.font = '700 30px system-ui, sans-serif'
  const seloW = ctx.measureText(seloTexto).width + 56
  ctx.fillStyle = '#9e673c'
  retanguloArredondado(ctx, W - 72 - seloW, 88, seloW, 64, 32)
  ctx.fill()
  ctx.fillStyle = '#fbf7ef'
  ctx.fillText(seloTexto, W - 72 - seloW + 28, 130)

  // Área da foto de capa
  const fotoX = 56
  const fotoY = 200
  const fotoW = W - 112
  const fotoH = 860
  ctx.save()
  retanguloArredondado(ctx, fotoX, fotoY, fotoW, fotoH, 32)
  ctx.clip()
  if (fotoCapa) {
    const escala = Math.max(fotoW / fotoCapa.width, fotoH / fotoCapa.height)
    const dw = fotoCapa.width * escala
    const dh = fotoCapa.height * escala
    ctx.drawImage(fotoCapa, fotoX + (fotoW - dw) / 2, fotoY + (fotoH - dh) / 2, dw, dh)
  } else {
    const grad = ctx.createLinearGradient(fotoX, fotoY, fotoX + fotoW, fotoY + fotoH)
    grad.addColorStop(0, '#243532')
    grad.addColorStop(1, '#36504c')
    ctx.fillStyle = grad
    ctx.fillRect(fotoX, fotoY, fotoW, fotoH)
    ctx.fillStyle = '#f4ecdf'
    ctx.font = '600 38px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(MARCA.nome, W / 2, fotoY + fotoH / 2)
    ctx.textAlign = 'left'
  }
  ctx.restore()

  // Borda suave na foto
  ctx.strokeStyle = '#e5d3b9'
  ctx.lineWidth = 4
  retanguloArredondado(ctx, fotoX, fotoY, fotoW, fotoH, 32)
  ctx.stroke()

  // Localização e Título
  let cursorY = 1140
  const local = [rotulo(TIPOS_IMOVEL, imovel.tipo), imovel.bairro, imovel.cidade].filter(Boolean).join(' · ')
  if (local) {
    ctx.fillStyle = '#9e673c'
    ctx.font = '700 34px system-ui, sans-serif'
    ctx.fillText(local.toUpperCase(), 64, cursorY)
    cursorY += 58
  }

  ctx.fillStyle = '#243532'
  ctx.font = '700 56px Georgia, serif'
  const linhasTitulo = quebrarLinhas(ctx, imovel.titulo, W - 128, 3)
  for (const linha of linhasTitulo) {
    ctx.fillText(linha, 64, cursorY)
    cursorY += 68
  }

  // Chips de especificações
  cursorY += 18
  const totalVagas = (imovel.vagas_cobertas ?? 0) + (imovel.vagas_descobertas ?? 0)
  const specs = [
    imovel.dormitorios != null && `${imovel.dormitorios} dorms`,
    imovel.suites > 0 && `${imovel.suites} suítes`,
    totalVagas > 0 && `${totalVagas} vagas`,
    imovel.area_construida != null && `${Number(imovel.area_construida)} m²`,
  ].filter(Boolean)

  if (specs.length > 0) {
    ctx.font = '600 30px system-ui, sans-serif'
    let chipX = 64
    for (const spec of specs) {
      const cw = ctx.measureText(spec).width + 44
      if (chipX + cw > W - 64) break
      ctx.fillStyle = '#fbf7ef'
      retanguloArredondado(ctx, chipX, cursorY, cw, 60, 30)
      ctx.fill()
      ctx.strokeStyle = '#e5d3b9'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#243532'
      ctx.fillText(spec, chipX + 22, cursorY + 40)
      chipX += cw + 16
    }
    cursorY += 100
  }

  // Bloco de preço em destaque
  const precos = precosDoImovel(imovel)
  if (precos.length > 0) {
    const p = precos[0]
    ctx.fillStyle = '#243532'
    retanguloArredondado(ctx, 64, 1510, W - 128, 175, 24)
    ctx.fill()

    ctx.fillStyle = '#e5d3b9'
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillText(p.rotulo.toUpperCase(), 108, 1572)

    ctx.fillStyle = '#fbf7ef'
    ctx.font = '700 66px system-ui, sans-serif'
    ctx.fillText(p.texto, 108, 1648)
  }

  // Rodapé com CTA
  ctx.fillStyle = '#4b635f'
  ctx.font = '600 32px system-ui, sans-serif'
  ctx.fillText('Agende sua visita pelo WhatsApp', 64, 1775)
  if (corretor) {
    ctx.fillStyle = '#243532'
    ctx.font = '700 30px system-ui, sans-serif'
    ctx.fillText(`Corretor: ${corretor}`, 64, 1825)
  }

  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'))
  if (!blob) throw new Error('Não foi possível gerar a imagem.')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `story-${(imovel.codigo || 'imovel').toLowerCase()}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
