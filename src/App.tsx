import { useState, useEffect } from 'react'
import { supabase } from './SupabaseClient'
import Dashboard from './components/Dashboard'
import TripDetails from './components/TripDetails' // IMPORT NUOVO
import './index.css'

function App(): JSX.Element {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  // Stato per navigazione
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

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

  // --- NAVIGAZIONE ---
  if (user) {
    if (selectedTripId) {
      // Mostra il planner se c'è un ID selezionato
      return <TripDetails tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />
    }

    // Altrimenti mostra Dashboard
    return <Dashboard user={user} onLogout={handleLogout} onSelectTrip={(id) => setSelectedTripId(id)} />
  }

  // --- LOGIN ---
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
          <p style={{color: '#ef4444', marginTop: 10, minHeight: '20px'}}>{msg}</p>
          <button className="btn-link" onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? 'Registrati' : 'Accedi'}</button>
        </div>
      </div>
    </div>
  )
}

export default App