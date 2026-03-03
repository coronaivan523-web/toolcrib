import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext'

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
)
