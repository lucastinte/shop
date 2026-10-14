import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuentes servidas desde la propia web (más rápido con conexión satelital
// y sin depender de Google Fonts). Solo los pesos que se usan.
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
