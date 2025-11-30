import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { TripCard } from './TripCard'
import { TripFormModal } from './TripFormModal'
import { ConfirmationModal } from './ui/ConfirmationModal'
import { Trip } from '../types/types'

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

    const [editingTripId, setEditingTripId] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    const [formData, setFormData] = useState({
        title: '', destination: '', startDate: '', endDate: '', accommodation: '', airport: ''
    })

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const userName = user?.user_metadata?.full_name || user?.email;

    useEffect(() => { fetchTrips() }, [])

    const fetchTrips = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('trips').select('*').order('start_date', { ascending: true })
        if (!error && data) setTrips(data)
        setLoading(false)
    }

    // Handle deletion
    const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
        e.stopPropagation()
        setTripToDelete(tripId)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!tripToDelete) return
        const { error } = await supabase.from('trips').delete().eq('id', tripToDelete)
        if (error) setErrorMsg('Errore cancellazione: ' + error.message)
        else { fetchTrips(); setShowDeleteModal(false); setTripToDelete(null); }
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

    const handleSaveTrip = async (data: typeof formData) => {
        setErrorMsg('')

        if (!data.title || !data.startDate || !data.endDate || !data.destination) return setErrorMsg('Compila i campi obbligatori (*).')

        const start = new Date(data.startDate); const end = new Date(data.endDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return setErrorMsg('Data fine errata.'); if (diffDays > 30) return setErrorMsg('Max 30 giorni.')

        const accomInfo = data.accommodation ? `Alloggio: ${data.accommodation}` : null

        if (editingTripId) {
            const original = trips.find(t => t.id === editingTripId)
            let newImg = original?.image_url
            if (original && original.destination.toLowerCase() !== data.destination.toLowerCase()) {
                newImg = await fetchUnsplashImage(data.destination) || undefined
            }
            const { error } = await supabase.from('trips').update({
                title: data.title, destination: data.destination, start_date: data.startDate, end_date: data.endDate, accommodation_info: accomInfo, image_url: newImg
            }).eq('id', editingTripId)

            if (error) setErrorMsg(error.message); else { setShowModal(false); fetchTrips(); }
            return
        }

        // Create
        let img = await fetchUnsplashImage(data.destination)
        if (!img) img = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'

        const { data: newTrip, error } = await supabase.from('trips').insert([{
            user_id: user.id, title: data.title, destination: data.destination, start_date: data.startDate, end_date: data.endDate, image_url: img, accommodation_info: accomInfo
        }]).select().single()

        if (error) return setErrorMsg(error.message)

        if (newTrip) {
            const daysArr = []; let count = 1;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                daysArr.push({ trip_id: newTrip.id, date: new Date(d).toISOString().split('T')[0], day_number: count++ })
            }
            await supabase.from('days').insert(daysArr)
            setShowModal(false); fetchTrips()
        }
    }

    // --- HANDLERS UI ---
    const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation()
        setEditingTripId(trip.id)
        setFormData({
            title: trip.title, destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date,
            accommodation: trip.accommodation_info ? trip.accommodation_info.replace('Alloggio: ', '').split(' | ')[0] : '', airport: ''
        })
        setErrorMsg('')
        setShowModal(true)
    }

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
                    {avatarUrl && <img src={avatarUrl} alt={userName} className="user-avatar" referrerPolicy='no-referrer' title={userName} />}
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

                    {loading ? (
                        <div style={{
                            height: '240px',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic'
                        }}>
                            Caricamento viaggi...
                        </div>
                    ) : (
                        trips.map((trip) => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                onSelect={onSelectTrip}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteTrip}
                            />
                        ))
                    )}
                </div>
            </main>

            <TripFormModal
                isOpen={showModal}
                isEditing={!!editingTripId}
                initialData={formData}
                onClose={() => setShowModal(false)}
                onSubmit={handleSaveTrip}
                errorMsg={errorMsg}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Elimina Viaggio"
                message="Sei sicuro? Tutti i giorni e le attività verranno persi per sempre."
                confirmText="Sì, elimina"
                isDangerous={true}
            />
        </div>
    )
}