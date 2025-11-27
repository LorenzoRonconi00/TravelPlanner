import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { Trash2 } from 'lucide-react'

interface Trip {
    id: string
    title: string
    destination: string
    start_date: string
    end_date: string
    accommodation_info?: string
    image_url?: string
}

interface DashboardProps {
    user: any
    onLogout: () => void
    onSelectTrip: (tripId: string) => void
}

export default function Dashboard({ user, onLogout, onSelectTrip }: DashboardProps): JSX.Element {
    const [trips, setTrips] = useState<Trip[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        accommodation: '',
        airport: ''
    })

    useEffect(() => {
        fetchTrips()
    }, [])

    const fetchTrips = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .order('start_date', { ascending: true })

        if (!error && data) setTrips(data)
        setLoading(false)
    }

    const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
        e.stopPropagation()

        if (!confirm('Sei sicuro di voler cancellare questo viaggio? Tutti i giorni e le attività verranno persi.')) {
            return
        }

        const { error } = await supabase.from('trips').delete().eq('id', tripId)

        if (error) {
            alert('Errore durante la cancellazione: ' + error.message)
        } else {
            fetchTrips()
        }
    }

    const fetchUnsplashImage = async (query: string): Promise<string | null> => {
        const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
        if (!accessKey) return null

        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
                { headers: { Authorization: `Client-ID ${accessKey}` } }
            )
            const data = await response.json()
            if (data.results && data.results.length > 0) {
                return data.results[0].urls.regular
            }
        } catch (error) {
            console.error("Errore Unsplash:", error)
        }
        return null
    }

    const handleCreateTrip = async () => {
        if (!formData.title || !formData.startDate || !formData.endDate || !formData.destination) return alert('Compila i campi obbligatori!')

        const start = new Date(formData.startDate)
        const end = new Date(formData.endDate)

        const diffTime = end.getTime() - start.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return alert('La data di fine non può essere precedente alla data di inizio!')
        }

        if (diffDays > 30) {
            return alert(`Il viaggio è troppo lungo (${diffDays} giorni). Il limite massimo è 30 giorni.`)
        }

        let coverImage = await fetchUnsplashImage(formData.destination)
        if (!coverImage) {
            coverImage = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'
        }

        const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .insert([{
                user_id: user.id,
                title: formData.title,
                destination: formData.destination,
                start_date: formData.startDate,
                end_date: formData.endDate,
                image_url: coverImage,
                accommodation_info: formData.accommodation
                    ? `Alloggio: ${formData.accommodation}${formData.airport ? ` | Arrivo: ${formData.airport}` : ''}`
                    : null
            }])
            .select()
            .single()

        if (tripError) return alert(tripError.message)

        if (tripData) {
            const daysArray = []
            let dayCount = 1

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                daysArray.push({
                    trip_id: tripData.id,
                    date: new Date(d).toISOString().split('T')[0],
                    day_number: dayCount++
                })
            }

            await supabase.from('days').insert(daysArray)

            setShowModal(false)
            setFormData({ title: '', destination: '', startDate: '', endDate: '', accommodation: '', airport: '' })
            fetchTrips()
        }
    }

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">
                <div className="brand-title">📔 Travel Planner</div>
                <div className="user-profile">
                    <span className="user-email">{user.email}</span>
                    <button className="logout-btn" onClick={onLogout}>Esci</button>
                </div>
            </header>

            <main className="dashboard-content">
                <h2 style={{ marginBottom: '30px', color: 'var(--text-main)' }}>I tuoi Itinerari</h2>

                <div className="trips-grid">
                    <div className="trip-card new-trip" onClick={() => setShowModal(true)}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>+</div>
                        <div>Nuova Avventura</div>
                    </div>

                    {loading ? <p>Caricamento...</p> : trips.map((trip) => (
                        <div
                            key={trip.id}
                            className="trip-card"
                            onClick={() => onSelectTrip(trip.id)}
                            style={{ backgroundImage: `url(${trip.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'})` }}
                        >

                            <button
                                className="trip-delete-btn"
                                onClick={(e) => handleDeleteTrip(e, trip.id)}
                            >
                                <Trash2 size={16} />
                            </button>

                            <div className="trip-card-overlay">
                                <h3 className="trip-title">{trip.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="trip-tag">📍 {trip.destination}</span>
                                </div>
                                <span className="trip-dates" style={{ marginTop: '10px' }}>
                                    {new Date(trip.start_date).toLocaleDateString()} ➝ {new Date(trip.end_date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, color: 'var(--text-main)' }}>Pianifica Viaggio</h2>
                        <div className="input-group">
                            <div className='input-subgroup'>
                                <label style={{ fontWeight: 'bold' }}>Nome Viaggio *</label>
                                <input className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Es. Vacanza dei miei sogni" />
                            </div>

                            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '60px' }}>
                                <div className='input-subgroup'>
                                    <label style={{ fontWeight: 'bold', marginRight: '15px' }}>Dal *</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        style={{cursor: 'pointer'}}
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        onClick={(e) => (e.currentTarget as any).showPicker()}
                                    />
                                </div>
                                <div className='input-subgroup'>
                                    <label style={{ fontWeight: 'bold', marginRight: '15px' }}>Al *</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        style={{cursor: 'pointer'}}
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        onClick={(e) => (e.currentTarget as any).showPicker()}
                                    />
                                </div>
                            </div>

                            <div className='input-subgroup'>
                                <label style={{ fontWeight: 'bold' }}>Destinazione *</label>
                                <input className="input-field" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} placeholder="Città o Paese" />
                            </div>

                            <div className='input-subgroup'>
                                <label style={{ fontWeight: 'bold' }}>Info Alloggio (Opzionale)</label>
                                <input className="input-field" value={formData.accommodation} onChange={e => setFormData({ ...formData, accommodation: e.target.value })} placeholder="Nome Alloggio..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="back-btn" onClick={() => setShowModal(false)}>Annulla</button>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleCreateTrip}>Crea</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}