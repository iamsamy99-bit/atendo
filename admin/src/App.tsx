import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from './api'
import { Form, Field } from './components/ui'
import Inicio from './pages/Inicio'
import Leads from './pages/Leads'
import Prospectos from './pages/Prospectos'
import Clientes from './pages/Clientes'
import Pagos from './pages/Pagos'
import Tickets from './pages/Tickets'

type Route = 'inicio' | 'leads' | 'prospectos' | 'clientes' | 'pagos' | 'tickets'
const ROUTES: { key: Route; label: string; icon: string }[] = [
  { key: 'inicio', label: 'Inicio', icon: '◆' },
  { key: 'leads', label: 'Leads', icon: '➤' },
  { key: 'prospectos', label: 'Prospector IA', icon: '⚡' },
  { key: 'clientes', label: 'Clientes', icon: '●' },
  { key: 'pagos', label: 'Pagos', icon: '$' },
  { key: 'tickets', label: 'Tickets', icon: '◉' },
]

function currentRoute(): Route {
  const h = window.location.hash.replace('#/', '').replace('#', '') as Route
  return ROUTES.some(r => r.key === h) ? h : 'inicio'
}

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!password || busy) return
    setBusy(true); setError('')
    try {
      await api.post('/login', { password })
      onOk()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">atendo<span>.</span></div>
        <p>Panel de administración</p>
        {error && <div className="error-box">{error}</div>}
        <Form onSubmit={submit}>
          <Field label="Contraseña de superadmin">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </Field>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </Form>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [route, setRoute] = useState<Route>(currentRoute)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    api.get('/me').then(() => setAuth(true)).catch(() => setAuth(false))
  }, [])

  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Al navegar se cierra el drawer móvil
  useEffect(() => { setMenuOpen(false) }, [route])

  const logout = useCallback(async () => {
    try { await api.post('/logout', {}) } catch { /* la sesión local igual se descarta */ }
    setAuth(false)
  }, [])

  if (auth === null) return <div className="loading">Cargando…</div>
  if (!auth) return <Login onOk={() => setAuth(true)} />

  const activeLabel = ROUTES.find(r => r.key === route)?.label ?? ''

  return (
    <div className="shell">
      {/* Barra superior móvil: hamburguesa + sección actual */}
      <header className="mobile-top">
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
          <span /><span /><span />
        </button>
        <div className="brand">atendo<span>.</span></div>
        <span className="mobile-route">{activeLabel}</span>
      </header>

      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}

      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">atendo<span>.</span></div>
        {ROUTES.map(r => (
          <a key={r.key} href={`#/${r.key}`} className={route === r.key ? 'active' : ''}>
            <span aria-hidden="true">{r.icon}</span> {r.label}
          </a>
        ))}
        <div className="spacer" />
        <button className="logout" onClick={logout}>Cerrar sesión</button>
      </nav>

      <main className="main">
        <div key={route} className="page-enter">
          {route === 'inicio' && <Inicio />}
          {route === 'leads' && <Leads />}
          {route === 'prospectos' && <Prospectos />}
          {route === 'clientes' && <Clientes />}
          {route === 'pagos' && <Pagos />}
          {route === 'tickets' && <Tickets />}
        </div>
      </main>
    </div>
  )
}
