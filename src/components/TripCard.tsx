import { Edit2, Trash2 } from 'lucide-react'
import { Trip } from '../types/types'

interface TripCardProps {
  trip: Trip
  isOwner: boolean
  onSelect: (id: string) => void
  onEdit: (e: React.MouseEvent, trip: Trip) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function TripCard({ trip, isOwner, onSelect, onEdit, onDelete }: TripCardProps) {
  return (
    <div
      className="trip-card"
      onClick={() => onSelect(trip.id)}
      style={{ backgroundImage: `url(${trip.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'})` }}
    >
      {/* ACTION BUTTONS */}
      {isOwner ? (
        <div style={{ position: 'absolute', top: 15, right: 15, display: 'flex', gap: '8px', zIndex: 20 }}>
          <button className="trip-action-btn edit" onClick={(e) => onEdit(e, trip)} title="Modifica">
            <Edit2 size={16} />
          </button>
          <button className="trip-action-btn delete" onClick={(e) => onDelete(e, trip.id)} title="Elimina">
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div style={{
          position: 'absolute', top: 15, right: 15, zIndex: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)',
          padding: '4px 10px 4px 4px', borderRadius: '20px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)', border: '1px solid #e7e5e4'
        }}>
          <img
            src={trip.owner?.avatar_url || 'https://via.placeholder.com/30'}
            alt="Owner"
            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#431407' }}>
            Condiviso
          </span>
        </div>
      )}

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