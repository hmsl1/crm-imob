// Datas "só dia" (YYYY-MM-DD) tratadas no fuso local. new Date('2026-12-01') seria meia-noite UTC,
// ou seja, 30/11 à noite no Brasil: por isso o dia é montado à mão.
export const hojeISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function dataLocal(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

// "2026-12-05" -> "05/12/2026"
export function dataBR(iso) {
  const d = dataLocal(iso)
  return d ? d.toLocaleDateString('pt-BR') : ''
}

// Dias de calendário de "agora" até a data: -1 = ontem, 0 = hoje, 3 = daqui a 3 dias; null se a data é inválida
export function diasAteData(iso, agora = new Date()) {
  const d = dataLocal(iso)
  if (!d) return null
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  return Math.round((d - hoje) / 86400000)
}
