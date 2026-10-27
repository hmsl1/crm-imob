// <option>s a partir de uma lista { id, rotulo }. "vazio" acrescenta a opção em branco com esse texto.
export default function Opcoes({ lista, vazio }) {
  return (
    <>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {lista.map((o) => (
        <option key={o.id} value={o.id}>
          {o.rotulo}
        </option>
      ))}
    </>
  )
}
