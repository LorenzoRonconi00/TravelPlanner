import { useState, useEffect } from 'react'
import { ErrorMessage } from './ui/ErrorMessage'

interface CollectionFormData {
    title: string
    description: string
}

interface CollectionFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CollectionFormData) => void
    errorMsg?: string
}

export function CollectionFormModal({ isOpen, onClose, onSubmit, errorMsg }: CollectionFormModalProps) {
    const [formData, setFormData] = useState<CollectionFormData>({ title: '', description: '' })
    const [internalError, setInternalError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setFormData({ title: '', description: '' })
            setInternalError('')
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = () => {
        if (!formData.title.trim()) {
            setInternalError('Il titolo è obbligatorio.')
            return
        }
        onSubmit(formData)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <h2 style={{ marginTop: 0, color: 'var(--text-main)' }}>Nuova Raccolta</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Crea una cartella per raggruppare più viaggi.
                </p>

                <div className="input-group">
                    <div className='input-subgroup'>
                        <label style={{ fontWeight: 'bold' }}>Nome Raccolta *</label>
                        <input
                            className="input-field"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Es. Eurotrip 2025"
                            autoFocus
                        />
                    </div>

                    <div className='input-subgroup'>
                        <label style={{ fontWeight: 'bold' }}>Descrizione (Opzionale)</label>
                        <textarea
                            className="input-field"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Note sulla raccolta..."
                        />
                    </div>
                </div>

                <ErrorMessage message={internalError || errorMsg || ''} />

                <div className="modal-footer">
                    <button className="back-btn" onClick={onClose}>Annulla</button>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSubmit}>
                        Crea Raccolta
                    </button>
                </div>
            </div>
        </div>
    )
}