import { AlertCircle } from 'lucide-react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'error' | 'info'
}

export function AlertModal({ isOpen, onClose, title, message, type = 'error' }: AlertModalProps) {
  if (!isOpen) return null

  const isError = type === 'error'
  const primaryColor = isError ? '#ef4444' : 'var(--primary)'

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>

        <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
                background: isError ? '#FEE2E2' : '#FFF7ED', 
                padding: 15, 
                borderRadius: '50%',
                color: primaryColor 
            }}>
                <AlertCircle size={32} />
            </div>
        </div>

        <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--text-main)', fontSize: '1.2rem' }}>
            {title}
        </h3>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.5' }}>
            {message}
        </p>
        
        <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 0 }}>
          <button 
            className="btn-primary" 
            style={{ width: '100%', backgroundColor: primaryColor }} 
            onClick={onClose}
          >
            {isError ? 'Chiudi' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}