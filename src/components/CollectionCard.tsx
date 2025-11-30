import { FolderOpen, Trash2, Layers } from 'lucide-react'
import { TripCollection } from '../types/types'

interface CollectionCardProps {
    collection: TripCollection
    onClick: (id: string) => void
    onDelete: (e: React.MouseEvent, id: string) => void
}

export function CollectionCard({ collection, onClick, onDelete }: CollectionCardProps) {

    const trips = collection.trips || []

    const img1 = trips[0]?.image_url || null
    const img2 = trips[1]?.image_url || null
    const img3 = trips[2]?.image_url || null

    const defaultBg = 'white'

    return (
        <div className="collection-wrapper" onClick={() => onClick(collection.id)}>

            <div
                className="collection-layer layer-bottom"
                style={{
                    backgroundImage: img3 ? `url(${img3})` : 'none',
                    backgroundColor: defaultBg
                }}
            />

            <div
                className="collection-layer layer-middle"
                style={{
                    backgroundImage: img2 ? `url(${img2})` : 'none',
                    backgroundColor: defaultBg
                }}
            />

            <div
                className="collection-layer layer-top"
                style={{
                    backgroundImage: img1 ? `url(${img1})` : 'none',
                    backgroundColor: defaultBg
                }}
            >
                <button
                    className="trip-action-btn delete"
                    onClick={(e) => onDelete(e, collection.id)}
                    title="Elimina raccolta"
                    style={{ position: 'absolute', top: 15, right: 15, zIndex: 20 }}
                >
                    <Trash2 size={16} />
                </button>

                {img1 ? (
                    <div className="collection-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <FolderOpen size={20} color="white" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'white' }}>Raccolta</span>
                        </div>
                        <h3 className="collection-title" style={{ margin: 0 }}>{collection.title}</h3>
                        <div className="collection-meta">
                            <Layers size={14} style={{ marginRight: 5 }} /> {trips.length} Tappe
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                        <FolderOpen size={32} color="var(--primary)" strokeWidth={1.5} />
                        <div>
                            <h3 className="collection-title" style={{ color: 'var(--text-main)' }}>{collection.title}</h3>
                            <div className="collection-meta" style={{ color: 'var(--text-muted)' }}>
                                {trips.length} Tappe
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}