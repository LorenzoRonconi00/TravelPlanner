import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { TripCard } from './TripCard'
import { TripFormModal } from './TripFormModal'
import { ConfirmationModal } from './ui/ConfirmationModal'
import { Trip } from '../types/types'

interface CollectionDetailsProps {
  collectionId: string
  onBack: () => void
  onSelectTrip: (tripId: string) => void
  userId: string
}

export default function CollectionDetails({ collectionId, onBack, onSelectTrip, userId }: CollectionDetailsProps): JSX.Element {
  const [collectionTitle, setCollectionTitle] = useState('')
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

  useEffect(() => {
    fetchCollectionData()
  }, [collectionId])

  const fetchCollectionData = async () => {
    setLoading(true)

    const { data: colData } = await supabase.from('collections').select('title').eq('id', collectionId).single()
    if (colData) setCollectionTitle(colData.title)

    const { data: tripsData, error } = await supabase
      .from('trips')
      .select('*')
      .eq('collection_id', collectionId)
      .order('start_date', { ascending: true })

    if (!error && tripsData) setTrips(tripsData)
    setLoading(false)
  }

  const fetchUnsplashImage = async (query: string) => {
    const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
    if (!accessKey) return null
    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`, { headers: { Authorization: `Client-ID ${accessKey}` } })
      const data = await response.json()
      return data.results?.[0]?.urls?.regular || null
    } catch (e) { return null }
  }

  const handleSaveTrip = async (data: typeof formData) => {
    setErrorMsg('')

    if (!data.title || !data.startDate || !data.endDate || !data.destination) return setErrorMsg('Compila i campi obbligatori (*).')

    const startTimestamp = new Date(data.startDate).setHours(0, 0, 0, 0)
    const endTimestamp = new Date(data.endDate).setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return setErrorMsg('Data fine errata.')
    if (diffDays > 30) return setErrorMsg('Max 30 giorni.')

    const conflict = trips.find(trip => {
      if (trip.id === editingTripId) return false

      const existingStart = new Date(trip.start_date).setHours(0, 0, 0, 0)
      const existingEnd = new Date(trip.end_date).setHours(0, 0, 0, 0)

      const isOverlapping = (startTimestamp < existingEnd) && (endTimestamp > existingStart)

      return isOverlapping
    })

    if (conflict) {
      return setErrorMsg(`Le date si sovrappongono con la tappa "${conflict.title}" (${new Date(conflict.start_date).toLocaleDateString()} - ${new Date(conflict.end_date).toLocaleDateString()}).`)
    }

    const accomInfo = data.accommodation ? `Alloggio: ${data.accommodation}` : null

    if (editingTripId) {
      const original = trips.find(t => t.id === editingTripId)
      let newImg = original?.image_url
      if (original && original.destination.toLowerCase() !== data.destination.toLowerCase()) {
        newImg = await fetchUnsplashImage(data.destination)
      }
      const { error } = await supabase.from('trips').update({
        title: data.title, destination: data.destination, start_date: data.startDate, end_date: data.endDate, accommodation_info: accomInfo, image_url: newImg
      }).eq('id', editingTripId)

      if (error) setErrorMsg(error.message); else { setShowModal(false); fetchCollectionData(); }
      return
    }

    let img = await fetchUnsplashImage(data.destination)
    if (!img) img = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'

    const { data: newTrip, error } = await supabase.from('trips').insert([{
      user_id: userId,
      collection_id: collectionId,
      title: data.title,
      destination: data.destination,
      start_date: data.startDate,
      end_date: data.endDate,
      image_url: img,
      accommodation_info: accomInfo
    }]).select().single()

    if (error) return setErrorMsg(error.message)

    if (newTrip) {
      const daysArr = []; let count = 1;
      const tripStart = new Date(data.startDate);
      const tripEnd = new Date(data.endDate);
      for (let d = new Date(tripStart); d <= tripEnd; d.setDate(d.getDate() + 1)) {
        daysArr.push({ trip_id: newTrip.id, date: new Date(d).toISOString().split('T')[0], day_number: count++ })
      }
      await supabase.from('days').insert(daysArr)
      setShowModal(false); fetchCollectionData()
    }
  }

  const handleEditClick = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation(); setEditingTripId(trip.id);
    setFormData({
      title: trip.title, destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date,
      accommodation: trip.accommodation_info ? trip.accommodation_info.replace('Alloggio: ', '').split(' | ')[0] : '', airport: ''
    })
    setErrorMsg(''); setShowModal(true)
  }

  const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation(); setTripToDelete(tripId); setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!tripToDelete) return
    await supabase.from('trips').delete().eq('id', tripToDelete)
    fetchCollectionData(); setShowDeleteModal(false); setTripToDelete(null);
  }

  const openNewTripModal = () => {
    setEditingTripId(null)
    setFormData({ title: '', destination: '', startDate: '', endDate: '', accommodation: '', airport: '' })
    setErrorMsg(''); setShowModal(true)
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="back-btn" onClick={onBack} style={{ border: 'none', fontSize: '1.5rem', padding: '10px', color: 'var(--primary)' }}>
            <ArrowLeft />
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>RACCOLTA</div>
            <div className="brand-title" style={{ fontSize: '1.5rem' }}>{collectionTitle}</div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Tappe del Viaggio</h2>
          <button
            className="btn-primary"
            style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}
            onClick={openNewTripModal}
          >
            <PlusCircle size={18} /> Aggiungi Tappa
          </button>
        </div>

        <div className="trips-grid">
          {loading ? <div>Caricamento tappe...</div> : trips.map((trip, index) => (
            <div key={trip.id} style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -10, left: -10, zIndex: 30,
                background: 'var(--primary)', color: 'white',
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {index + 1}
              </div>
              <TripCard
                trip={trip}
                isOwner={trip.user_id === userId}
                onSelect={onSelectTrip}
                onEdit={handleEditClick}
                onDelete={handleDeleteTrip}
              />
            </div>
          ))}

          {trips.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', marginTop: 50 }}>
              Questa raccolta è vuota. Aggiungi la prima tappa del tuo viaggio!
            </div>
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
        title="Elimina Tappa"
        message="Sei sicuro? Tutti i dati di questa tappa verranno persi."
        confirmText="Elimina"
        isDangerous={true}
      />
    </div>
  )
}