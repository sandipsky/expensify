import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@lumen-ui/react/styles.css'
import './index.scss'
import { AppProviders } from './providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
