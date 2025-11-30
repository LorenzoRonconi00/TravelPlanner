import { useEffect, useState } from 'react'
import { CityAutocomplete } from './ui/CityAutocomplete'
import { ErrorMessage } from './ui/ErrorMessage'

interface TripFormData {
  title: string
  destination: string
  startDate: string
  endDate: string
  accommodation: string
  airport: string
}

interface TripFormModalProps {
  isOpen: boolean
  isEditing: boolean
  initialData: TripFormData
  onClose: () => void
  onSubmit: (data: TripFormData) => void
  errorMsg?: string
}

export function TripFormModal({ isOpen, isEditing, initialData, onClose, onSubmit, errorMsg }: TripFormModalProps) {
  const [formData, setFormData] = useState<TripFormData>(initialData)

  useEffect(() => {
    setFormData(initialData)
  }, [initialData, isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 style={{ marginTop: 0, color: 'var(--text-main)' }}>
          {isEditing ? 'Modifica Viaggio' : 'Pianifica Viaggio'}
        </h2>
        
        <div className="input-group">
          <div className='input-subgroup'>
            <label style={{ fontWeight: 'bold' }}>Nome Viaggio *</label>
            <input 
              className="input-field" 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              placeholder="Es. Vacanza dei miei sogni" 
            />
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
            <CityAutocomplete 
              value={formData.destination}
              onChange={(val) => setFormData({ ...formData, destination: val })}
              placeholder="Cerca città (es. Parigi)"
            />
          </div>

          <div className='input-subgroup'>
            <label style={{ fontWeight: 'bold' }}>Info Alloggio (Opzionale)</label>
            <input 
              className="input-field" 
              value={formData.accommodation} 
              onChange={e => setFormData({ ...formData, accommodation: e.target.value })} 
              placeholder="Nome Alloggio..." 
            />
          </div>
        </div>

        <ErrorMessage message={errorMsg || ''} />

        <div className="modal-footer">
          <button className="back-btn" onClick={onClose}>Annulla</button>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => onSubmit(formData)}>
            {isEditing ? 'Salva Modifiche' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}