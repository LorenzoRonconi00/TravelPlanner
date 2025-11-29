import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { Trash2, Edit2 } from 'lucide-react'

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
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [tripToDelete, setTripToDelete] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [editingTripId, setEditingTripId] = useState<string | null>(null)

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const userName = user?.user_metadata?.full_name || user?.email;

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

    // Fetch trips from Supabase
    const fetchTrips = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .order('start_date', { ascending: true })

        if (!error && data) setTrips(data)
        setLoading(false)
    }

    // State handlers for delete modal
    const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
        e.stopPropagation()
        setTripToDelete(tripId)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!tripToDelete) return

        const { error } = await supabase.from('trips').delete().eq('id', tripToDelete)

        if (error) {
            alert('Errore cancellazione: ' + error.message)
        } else {
            fetchTrips()
        }

        // Chiudi e pulisci
        setShowDeleteModal(false)
        setTripToDelete(null)
    }

    // Fetch image from Unsplash
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

    // Create trip
    const handleCreateTrip = async () => {
        setErrorMsg('')

        if (!formData.title || !formData.startDate || !formData.endDate || !formData.destination) {
            return setErrorMsg('Per favore, compila tutti i campi obbligatori (*).')
        }

        const start = new Date(formData.startDate)
        const end = new Date(formData.endDate)
        const diffTime = end.getTime() - start.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays < 0) return setErrorMsg('La data di fine deve essere successiva all\'inizio.')
        if (diffDays > 30) return setErrorMsg('Il viaggio non può durare più di 30 giorni.')

        const accomInfo = formData.accommodation
            ? `Alloggio: ${formData.accommodation}${formData.airport ? ` | Arrivo: ${formData.airport}` : ''}`
            : null

        if (editingTripId) {
            const originalTrip = trips.find(t => t.id === editingTripId)
            let newImageUrl = originalTrip?.image_url

            if (originalTrip && originalTrip.destination.toLowerCase() !== formData.destination.toLowerCase()) {
                const img = await fetchUnsplashImage(formData.destination)
                if (img) newImageUrl = img
            }

            const { error } = await supabase
                .from('trips')
                .update({
                    title: formData.title,
                    destination: formData.destination,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    accommodation_info: accomInfo,
                    image_url: newImageUrl
                })
                .eq('id', editingTripId)

            if (error) alert(error.message)
            else {
                setShowModal(false)
                fetchTrips()
            }
            return
        }

        let coverImage = await fetchUnsplashImage(formData.destination)
        if (!coverImage) coverImage = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'

        const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .insert([{
                user_id: user.id,
                title: formData.title,
                destination: formData.destination,
                start_date: formData.startDate,
                end_date: formData.endDate,
                image_url: coverImage,
                accommodation_info: accomInfo
            }])
            .select()
            .single()

        if (tripError) return setErrorMsg(tripError.message)

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
            fetchTrips()
        }
    }

    // Edit trip
    const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation()
        setEditingTripId(trip.id)

        setFormData({
            title: trip.title,
            destination: trip.destination,
            startDate: trip.start_date,
            endDate: trip.end_date,
            accommodation: trip.accommodation_info ? trip.accommodation_info.split(' | ')[0].replace('Alloggio: ', '') : '',
            airport: trip.accommodation_info && trip.accommodation_info.includes('| Arrivo:') ? trip.accommodation_info.split('| Arrivo: ')[1] : ''
        })

        setErrorMsg('')
        setShowModal(true)
    }

    // Clean form
    const openNewTripModal = () => {
        setEditingTripId(null)
        setFormData({ title: '', destination: '', startDate: '', endDate: '', accommodation: '', airport: '' })
        setErrorMsg('')
        setShowModal(true)
    }

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">
                <div className="brand-title">📔 Travel Planner</div>
                <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    {/* SE C'È L'IMMAGINE, MOSTRALA */}
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt={userName}
                            className="user-avatar"
                            title={userName}
                            referrerPolicy='no-referrer'
                        />
                    )}

                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                <h2 style={{ marginBottom: '30px', color: 'var(--text-main)' }}>I tuoi Itinerari</h2>

                <div className="trips-grid">
                    <div className="trip-card new-trip" onClick={openNewTripModal}>
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

                            <div style={{ position: 'absolute', top: 15, right: 15, display: 'flex', gap: '8px', zIndex: 20 }}>

                                {/* EDIT BUTTON */}
                                <button
                                    className="trip-action-btn edit"
                                    onClick={(e) => handleEditClick(e, trip)}
                                    title="Modifica viaggio"
                                >
                                    <Edit2 size={16} />
                                </button>

                                {/* DELETE BUTTON */}
                                <button
                                    className="trip-action-btn delete"
                                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                                    title="Elimina viaggio"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

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
                        <h2 style={{ marginTop: 0, color: 'var(--text-main)' }}>
                            {editingTripId ? 'Modifica Viaggio' : 'Pianifica Viaggio'}
                        </h2>
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
                                        style={{ cursor: 'pointer' }}
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
                                        style={{ cursor: 'pointer' }}
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

                        {errorMsg && <div className="modal-error">{errorMsg}</div>}

                        <div className="modal-footer">
                            <button className="back-btn" onClick={() => setShowModal(false)}>Annulla</button>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleCreateTrip}>
                                {editingTripId ? 'Salva Modifiche' : 'Crea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Sei sicuro?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>
                            Vuoi davvero cancellare questo viaggio? <br />
                            Tutti i giorni e le attività verranno persi per sempre.
                        </p>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="back-btn" onClick={() => setShowDeleteModal(false)}>Annulla</button>
                            <button
                                className="btn-primary"
                                style={{ width: 'auto', backgroundColor: 'var(--red-button)' }}
                                onClick={confirmDelete}
                            >
                                Sì, elimina
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}