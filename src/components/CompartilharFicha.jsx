import { useEffect, useState } from 'react'
import { fichaDoImovel, fichaComFotos } from '../lib/ficha.js'
import { primeiroNome } from '../lib/lead.js'
import { abrirWhatsapp, baixarFotos, compartilharComFotos, suportaCompartilharFotos } from '../lib/whatsapp.js'
import { useFechamentoAnimado } from '../lib/useFechamentoAnimado.js'

const MAX_ANEXOS = 5

// Envia a ficha do imóvel pelo WhatsApp.
// - "Abrir no WhatsApp": texto da ficha (com links das fotos, se marcado). Funciona em qualquer aparelho.
// - "Enviar com fotos anexadas": folha de compartilhamento do celular com as fotos de verdade (quando o aparelho permite).
export default function CompartilharFicha({ imovel, corretor, lead = null, onFechar }) {
  const { saindo, fechar } = useFechamentoAnimado()
  const fotos = imovel.fotos ?? []
  const podeAnexar = suportaCompartilharFotos() && fotos.length > 0

  const abertura = lead ? `Olá, ${primeiroNome(lead.nome) || 'tudo bem'}! Segue a ficha do imóvel:\n\n` : ''
  const [corpo, setCorpo] = useState(() => abertura + fichaDoImovel(imovel, { corretor }))
  const [incluirLinks, setIncluirLinks] = useState(true)
  const [arquivos, setArquivos] = useState(null) // null = preparando; [] = indisponível
  const [aviso, setAviso] = useState('')

  // Baixa as fotos já ao abrir: o navegador só deixa compartilhar logo após o toque do usuário
  useEffect(() => {
    if (!podeAnexar) return
    let ativo = true
    baixarFotos(fotos, MAX_ANEXOS)
      .then((f) => ativo && setArquivos(f))
      .catch(() => ativo && setArquivos([]))
    return () => {
      ativo = false
    }
  }, [])

  const textoComLinks = fichaComFotos(corpo, imovel, { incluirFotos: incluirLinks })

  async function enviarComFotos() {
    setAviso('')
    try {
      const r = await compartilharComFotos({ titulo: imovel.titulo, texto: corpo, arquivos })
      if (r === 'sem-suporte') setAviso('Este aparelho não permite anexar fotos. Use "Abrir no WhatsApp" (com links das fotos).')
    } catch {
      setAviso('Não foi possível abrir o compartilhamento. Tente "Abrir no WhatsApp".')
    }
  }

  return (
    <div className={'fundo-modal' + (saindo ? ' saindo' : '')} onClick={() => fechar(onFechar)}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Compartilhar ficha" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Compartilhar ficha</h2>
          <button className="link" onClick={() => fechar(onFechar)} aria-label="Fechar">
            ✕
          </button>
        </div>

        <p className="dica">
          {lead ? `Para ${lead.nome}. ` : ''}Edite o texto se quiser. Os dados do proprietário nunca entram na ficha.
        </p>

        <label>
          Mensagem
          <textarea rows={12} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        </label>

        {fotos.length > 0 && (
          <label className="check">
            <input type="checkbox" checked={incluirLinks} onChange={(e) => setIncluirLinks(e.target.checked)} />
            Incluir links das fotos no texto ({Math.min(fotos.length, 4)} primeiras)
          </label>
        )}
        {fotos.length === 0 && <p className="dica">Este imóvel ainda não tem fotos.</p>}
        {aviso && <p className="erro">{aviso}</p>}

        <div className="acoes">
          <span className="espaco" />
          {podeAnexar && arquivos?.length > 0 && (
            <button type="button" onClick={enviarComFotos}>
              Enviar com fotos anexadas
            </button>
          )}
          {podeAnexar && arquivos === null && <button disabled>Preparando fotos…</button>}
          <button
            type="button"
            className="primario"
            onClick={() => abrirWhatsapp(lead?.telefone, textoComLinks)}
          >
            Abrir no WhatsApp
          </button>
        </div>
        {!lead?.telefone && <p className="dica">Sem telefone do lead: o WhatsApp vai pedir para você escolher o contato.</p>}
      </div>
    </div>
  )
}
