import { StrictMode }   from 'react'
import { createRoot }   from 'react-dom/client'
// import { ChatProvider } from './store/chatStore'   // résout vers chatStore.tsx
import { ChatProvider } from './store/chatStore.tsx'   // résout vers chatStore.tsx
import App              from './App'
import './styles/globals.scss'                       // ← .css pas .scss → pas d'erreur TS 2882

const container = document.getElementById('root')!
createRoot(container).render(
  <StrictMode>
    <ChatProvider>
      <App />
    </ChatProvider>
  </StrictMode>
)
