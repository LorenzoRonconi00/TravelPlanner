import { Edit2, Trash2 } from 'lucide-react'
import { Trip } from '../types/types'

interface TripCardProps {
  trip: Trip
  onSelect: (id: string) => void
  onEdit: (e: React.MouseEvent, trip: Trip) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function TripCard({ trip, onSelect, onEdit, onDelete }: TripCardProps) {
  return (
    <div 
      className="trip-card" 
      onClick={() => onSelect(trip.id)}
      style={{ backgroundImage: `url(${trip.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'})` }}
    >
      <div style={{ position: 'absolute', top: 15, right: 15, display: 'flex', gap: '8px', zIndex: 20 }}>
        {/* EDIT BUTTON */}
        <button 
          className="trip-action-btn edit" 
          onClick={(e) => onEdit(e, trip)}
          title="Modifica viaggio"
        >
          <Edit2 size={16} />
        </button>

        {/* DELETE BUTTON */}
        <button 
          className="trip-action-btn delete" 
          onClick={(e) => onDelete(e, trip.id)}
          title="Elimina viaggio"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="trip-card-overlay">
        <h3 className="trip-title" title={trip.title}>{trip.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="trip-tag">📍 {trip.destination}</span>
        </div>
        <span className="trip-dates" style={{ marginTop: '10px' }}>
          {new Date(trip.start_date).toLocaleDateString()} ➝ {new Date(trip.end_date).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}