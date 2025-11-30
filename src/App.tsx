import { useState, useEffect } from 'react'
import { supabase } from './SupabaseClient'
import Dashboard from './components/Dashboard'
import TripDetails from './components/TripDetails'
import CollectionDetails from './components/CollectionDetails'
import AuthScreen from './components/AuthScreen'
import './index.css'

function App(): JSX.Element {
  const [user, setUser] = useState<any>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))

    const handleDeepLink = (_event: any, url: string) => {
      try {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1]
        if (!fragment) return

        const params = new URLSearchParams(fragment)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        }
      } catch (err) {
        console.error("Errore parsing URL", err)
      }
    }

    if ((window as any).electron) {
      (window as any).electron.ipcRenderer.on('deep-link', handleDeepLink)
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSelectedTripId(null)
  }

  if (user) {
    if (selectedTripId) {
      return <TripDetails tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />
    }

    if (selectedCollectionId) {
      return (
        <CollectionDetails
          userId={user.id}
          collectionId={selectedCollectionId}
          onBack={() => setSelectedCollectionId(null)}
          onSelectTrip={(tripId) => setSelectedTripId(tripId)}
        />
      )
    }

    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onSelectTrip={(tripId) => setSelectedTripId(tripId)}
        onSelectCollection={(colId) => setSelectedCollectionId(colId)}
      />
    )
  }

  return <AuthScreen />
}

export default App