import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registrarServiceWorker } from './push'
import { instalarAtalhosGlobais } from './teclado'

registrarServiceWorker()
instalarAtalhosGlobais()

// As telas sao baixadas so quando abertas. Se sair versao nova com o app aberto, os arquivos
// da versao antiga deixam de existir: recarrega a pagina uma vez para pegar a versao nova
// (no maximo 1 recarga por minuto, para nao entrar em loop se o problema for outro).
window.addEventListener('vite:preloadError', (evento) => {
  try {
    const ultima = Number(sessionStorage.getItem('recarga_versao') || 0)
    if (Date.now() - ultima < 60_000) return
    sessionStorage.setItem('recarga_versao', String(Date.now()))
  } catch {
    // sem sessionStorage: recarrega mesmo assim
  }
  evento.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
