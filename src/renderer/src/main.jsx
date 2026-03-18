import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SplashScreen from './components/SplashScreen'
import { isSupabaseConfigured } from './lib/supabase'
import './styles/global.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React crash:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <SplashScreen
          error={`Erro interno da aplicação: ${this.state.error?.message ?? 'desconhecido'}. Reinstale ou contate o suporte.`}
        />
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured ? (
        <App />
      ) : (
        <SplashScreen error="As variáveis de ambiente do Supabase não foram configuradas neste build." />
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
