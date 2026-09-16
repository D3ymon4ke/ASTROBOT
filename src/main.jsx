import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './workspace.css'
import PlatformRouter from './platform/PlatformRouter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlatformRouter />
  </StrictMode>,
)
