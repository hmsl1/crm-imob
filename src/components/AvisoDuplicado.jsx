// Aviso de duplicidade (lead com o mesmo telefone/e-mail, imóvel no mesmo endereço).
// Não grava nada sozinho: o usuário escolhe entre corrigir, abrir o cadastro existente ou salvar mesmo assim.
export default function AvisoDuplicado({ titulo, itens, onAbrir, onSalvarMesmoAssim, onCorrigir, salvando = false }) {
  return (
    <div className="aviso-duplicado" role="alert">
      <strong>{titulo}</strong>
      <ul>
        {itens.map((item) => (
          <li key={item.id}>
            <span>
              {item.principal}
              {item.detalhe && <small> · {item.detalhe}</small>}
            </span>
            {onAbrir && (
              <button type="button" className="link pequeno" onClick={() => onAbrir(item.id)}>
                Abrir
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="acoes-aviso">
        <button type="button" className="pequeno" onClick={onCorrigir}>
          Corrigir
        </button>
        <button type="button" className="pequeno primario" onClick={onSalvarMesmoAssim} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar mesmo assim'}
        </button>
      </div>
    </div>
  )
}
