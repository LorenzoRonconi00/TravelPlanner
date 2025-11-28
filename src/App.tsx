import { useState, useEffect } from 'react'
import { supabase } from './SupabaseClient'
import Dashboard from './components/Dashboard'
import TripDetails from './components/TripDetails'
import './index.css'

function App(): JSX.Element {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))

    // Deep Link handler
    const handleDeepLink = (_event: any, url: string) => {

      try {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1]
        if (!fragment) return console.log("Nessun frammento trovato")

        const params = new URLSearchParams(fragment)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ error }) => {
            if (error) {
              console.error("Errore SetSession:", error)
              setMsg('Errore login: ' + error.message)
            } else {
              console.log("Sessione impostata con successo")
              setMsg('Login Google OK!')
            }
          })
        }
      } catch (err) {
        console.error("Errore parsing URL", err)
      }
    }

    if ((window as any).electron) {
      (window as any).electron.ipcRenderer.on('deep-link', handleDeepLink)
    } else {
      console.error("ERROR: window.electron NOT FOUND!")
    }

    return () => subscription.unsubscribe()
  }, [])

  // Google Login handler
  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'travel-planner://login-callback',
        skipBrowserRedirect: true
      }
    })

    if (error) {
      setMsg(error.message)
    } else if (data?.url) {
      if ((window as any).electron) {
        (window as any).electron.ipcRenderer.invoke('open-external-url', data.url)
      } else {
        // Fallback
        window.open(data.url, '_blank')
      }
    }
  }

  const handleAuth = async () => {
    setMsg('Caricamento...')
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
      else setMsg('')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg(error.message)
      else setMsg('Controlla la tua email!')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSelectedTripId(null)
  }

  // Navigation
  if (user) {
    if (selectedTripId) {
      return <TripDetails tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />
    }

    return <Dashboard user={user} onLogout={handleLogout} onSelectTrip={(id) => setSelectedTripId(id)} />
  }

  // Login
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-image-side">
          <div className="auth-image-overlay"></div>
          <div className="auth-quote">"Il viaggio è l'unica cosa che compri che ti rende più ricco."<span>Travel Planner App</span></div>
        </div>
        <div className="auth-form-side">
          <h1 className="app-title">{isLoginMode ? 'Accedi' : 'Crea Account'}</h1>
          <div className="input-group">
            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
          </div>
          <button className="btn-primary" onClick={handleAuth}>{isLoginMode ? 'Entra' : 'Registrati'}</button>

          {/* SEPARATORE E BOTTONE GOOGLE */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }}></div>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>oppure</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }}></div>
          </div>

          <button
            className="btn-primary"
            onClick={handleGoogleLogin}
            style={{
              backgroundColor: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'Nunito, sans-serif'
            }}
          >
            {/* SVG Logo Google */}
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" /><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" /><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" /><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" /></svg>
            Accedi con Google
          </button>

          <p style={{ color: '#ef4444', marginTop: 10, minHeight: '20px' }}>{msg}</p>
          <button className="btn-link" onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? 'Registrati' : 'Accedi'}</button>
        </div>
      </div>
    </div>
  )
}

export default App