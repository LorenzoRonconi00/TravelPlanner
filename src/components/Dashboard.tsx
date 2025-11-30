import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { TripCard } from './TripCard'
import { TripFormModal } from './TripFormModal'
import { ConfirmationModal } from './ui/ConfirmationModal'
import { Trip } from '../types/types'
import { Users, PlusCircle, FolderPlus } from 'lucide-react'
import { FriendsModal } from './FriendsModal'
import { TripCollection } from '../types/types'
import { CollectionCard } from './CollectionCard'
import { CollectionFormModal } from './CollectionFormModal'

interface DashboardProps {
    user: any
    onLogout: () => void
    onSelectTrip: (tripId: string) => void
    onSelectCollection: (collectionId: string) => void
}

export default function Dashboard({ user, onLogout, onSelectTrip, onSelectCollection }: DashboardProps): JSX.Element {
    const [trips, setTrips] = useState<Trip[]>([])
    const [collections, setCollections] = useState<TripCollection[]>([])
    const [loading, setLoading] = useState(true)

    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showCollectionModal, setShowCollectionModal] = useState(false)
    const [tripToDelete, setTripToDelete] = useState<string | null>(null)
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null)

    const [editingTripId, setEditingTripId] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    const [formData, setFormData] = useState({
        title: '', destination: '', startDate: '', endDate: '', accommodation: '', airport: ''
    })

    const [showFriendsModal, setShowFriendsModal] = useState(false)
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const userName = user?.user_metadata?.full_name || user?.email;

    useEffect(() => { fetchTrips() }, [])

    useEffect(() => {
        fetchTrips()
        fetchPendingCount()
    }, [])

    //#region TRIPS

    const fetchTrips = async () => {
        setLoading(true)

        const tripsQuery = supabase
            .from('trips')
            .select('*')
            .is('collection_id', null)
            .order('start_date', { ascending: true })

        const collectionsQuery = supabase
            .from('collections')
            .select('*, trips(*)')
            .order('created_at', { ascending: false })

        const [tripsRes, collRes] = await Promise.all([tripsQuery, collectionsQuery])

        if (tripsRes.data) setTrips(tripsRes.data)
        if (collRes.data) setCollections(collRes.data)

        setLoading(false)
    }

    // Handle deletion
    const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
        e.stopPropagation()
        setTripToDelete(tripId)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        // Delete trip
        if (tripToDelete) {
            const { error } = await supabase.from('trips').delete().eq('id', tripToDelete)
            if (error) alert('Errore: ' + error.message)
            else { fetchTrips(); setShowDeleteModal(false); setTripToDelete(null); }
        }
        // Delete collection
        else if (collectionToDelete) {
            const { error } = await supabase.from('collections').delete().eq('id', collectionToDelete)
            if (error) alert('Errore: ' + error.message)
            else { fetchTrips(); setShowDeleteModal(false); setCollectionToDelete(null); }
        }
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

    //#endregion

    //#region FRIENDS

    const fetchPendingCount = async () => {
        const { count, error } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('status', 'pending')

        if (!error && count !== null) {
            setPendingRequestsCount(count)
        }
    }

    //#endregion

    //#region UNSPLASH

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

    //#endregion

    //#region MODAL

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

    const handleCreateCollection = async (data: { title: string, description: string }) => {
        setErrorMsg('')
        const { error } = await supabase.from('collections').insert([{
            user_id: user.id,
            title: data.title,
            description: data.description,
        }])

        if (error) {
            setErrorMsg(error.message)
        } else {
            setShowCollectionModal(false)
            fetchTrips()
        }
    }

    const handleDeleteCollection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setCollectionToDelete(id)
        setShowDeleteModal(true)
    }

    //#endregion

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">

                {/* TITLE */}
                <div className="brand-title">📔 Travel Planner</div>

                <div className="user-profile">
                    {/* AVATAR */}
                    {avatarUrl && <img src={avatarUrl} alt={userName} className="user-avatar" referrerPolicy='no-referrer' title={userName} />}

                    {/* FRIENDS BUTTON */}
                    <button
                        onClick={() => setShowFriendsModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'white',
                            border: '1px solid var(--border-color)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                    >
                        <Users size={18} />
                        Amici

                        {/* NOTIFICATION BUTTON */}
                        {pendingRequestsCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -5,
                                right: -5,
                                backgroundColor: '#ef4444',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}>
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>

                    {/* LOGOUT BUTTON */}
                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </header>

            {/* MAIN */}
            <main className="dashboard-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-main)' }}>I tuoi Itinerari</h2>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        {/* ADD TRIP */}
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}
                            onClick={openNewTripModal}
                        >
                            <PlusCircle size={18} /> Nuovo Viaggio
                        </button>

                        {/* ADD FOLDER */}
                        <button
                            className="btn-primary"
                            style={{
                                width: 'auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem',
                                backgroundColor: 'white', color: 'var(--primary)', border: '1px solid var(--primary)'
                            }}
                            onClick={() => setShowCollectionModal(true)}
                        >
                            <FolderPlus size={18} /> Nuova Raccolta
                        </button>
                    </div>
                </div>
                <div className="trips-grid">

                    {loading ? (
                        <div style={{ gridColumn: '1 / -1', padding: 20, color: 'gray' }}>Caricamento...</div>
                    ) : (
                        <>
                            {/* 3. LISTA COLLEZIONI */}
                            {collections.map((col) => (
                                <CollectionCard
                                    key={col.id}
                                    collection={col}
                                    onClick={(id) => onSelectCollection(id)}
                                    onDelete={handleDeleteCollection}
                                />
                            ))}

                            {/* 4. LISTA VIAGGI SINGOLI */}
                            {trips.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    onSelect={onSelectTrip}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteTrip}
                                />
                            ))}
                        </>
                    )}
                </div>
            </main>

            {/* TRIP MODAL */}
            <TripFormModal
                isOpen={showModal}
                isEditing={!!editingTripId}
                initialData={formData}
                onClose={() => setShowModal(false)}
                onSubmit={handleSaveTrip}
                errorMsg={errorMsg}
            />

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setTripToDelete(null); setCollectionToDelete(null); }}
                onConfirm={confirmDelete}
                title={collectionToDelete ? "Elimina Raccolta" : "Elimina Viaggio"}
                message={
                    collectionToDelete
                        ? "Se elimini la raccolta, i viaggi al suo interno NON verranno cancellati, ma torneranno nella lista principale."
                        : "Sei sicuro? Tutti i giorni e le attività verranno persi per sempre."
                }
                confirmText="Sì, elimina"
                isDangerous={true}
            />

            {/* FRIENDS MODAL */}
            <FriendsModal
                isOpen={showFriendsModal}
                onClose={() => setShowFriendsModal(false)}
                pendingCount={pendingRequestsCount}
                onUpdate={fetchPendingCount}
            />

            {/* COLLECTION MODAL */}
            <CollectionFormModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                onSubmit={handleCreateCollection}
                errorMsg={errorMsg}
            />
        </div>
    )
}