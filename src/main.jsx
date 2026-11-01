import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// abre a conexão com o Supabase (DNS + TLS) já no início, antes da primeira consulta
try {
  const origem = new URL(import.meta.env.VITE_SUPABASE_URL).origin
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = origem
  link.crossOrigin = ''
  document.head.appendChild(link)
} catch {
  /* sem URL configurada: a tela de configuração pendente aparece normalmente */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
