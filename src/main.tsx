import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ShiftProvider } from './context/ShiftContext.tsx'
import { UserProvider } from './context/UserContext.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ShiftProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </ShiftProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
