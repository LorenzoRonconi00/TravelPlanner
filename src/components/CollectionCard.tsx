import { FolderOpen, Trash2 } from 'lucide-react'
import { TripCollection } from '../types/types'

interface CollectionCardProps {
  collection: TripCollection
  onClick: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function CollectionCard({ collection, onClick, onDelete }: CollectionCardProps) {
  return (
    <div className="collection-card" onClick={() => onClick(collection.id)}>
      
      {/* DELETE BUTTON */}
      <button 
        className="trip-action-btn delete" 
        onClick={(e) => onDelete(e, collection.id)}
        title="Elimina raccolta"
        style={{ position: 'absolute', top: 15, right: 15, zIndex: 20 }}
      >
        <Trash2 size={16} />
      </button>

      <div style={{ marginBottom: 'auto', marginTop: '10px' }}>
        <FolderOpen size={32} color="var(--primary)" strokeWidth={1.5} />
      </div>

      <div>
        <h3 className="collection-title">{collection.title}</h3>
        <div className="collection-meta">
          {collection.trips?.length || 0} Tappe
        </div>
      </div>
    </div>
  )
}