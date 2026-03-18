import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SplashScreen from './components/SplashScreen'
import { isSupabaseConfigured } from './lib/supabase'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <App />
    ) : (
      <SplashScreen error="As variáveis de ambiente do Supabase não foram configuradas neste build." />
    )}
  </React.StrictMode>
)
