import { useState } from 'react'
import { MARCA } from '../config.js'

export default function Marca({ grande = false }) {
  const [semLogo, setSemLogo] = useState(!MARCA.logo)

  return (
    <div className={'marca' + (grande ? ' grande' : '')}>
            {!semLogo ? (
        <img src={MARCA.logo} alt={MARCA.nome} className="logo" onError={() => setSemLogo(true)} />
      ) : (
        <h1>{MARCA.nome}</h1>
      )}
    </div>
  )
}
