import { useState, useEffect } from 'react'
import { supabase } from './SupabaseClient'

function App(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [msg, setMsg] = useState('')

  // Controlla se c'è già una sessione attiva all'avvio
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Ascolta i cambiamenti di stato (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    setMsg('Caricamento...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg('Errore: ' + error.message)
    else setMsg('')
  }

  const handleSignup = async () => {
    setMsg('Registrazione...')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMsg('Errore: ' + error.message)
    else setMsg('Controlla la tua email per confermare!')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Travel Planner ✈️</h1>
      
      {user ? (
        <div style={{ background: '#334155', padding: '20px', borderRadius: '8px' }}>
          <h3>Benvenuto!</h3>
          <p>Sei loggato come: {user.email}</p>
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 20px', cursor: 'pointer', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={handleLogin} style={{ padding: '10px 20px', cursor: 'pointer' }}>Login</button>
            <button onClick={handleSignup} style={{ padding: '10px 20px', cursor: 'pointer' }}>Registrati</button>
          </div>
          <p style={{ color: 'yellow' }}>{msg}</p>
        </div>
      )}
    </div>
  )
}

export default App