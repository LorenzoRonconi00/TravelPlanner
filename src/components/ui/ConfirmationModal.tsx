interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  isDangerous?: boolean
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Conferma", 
  isDangerous = false 
}: ConfirmationModalProps) {
  
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>{message}</p>
        
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="back-btn" onClick={onClose}>Annulla</button>
          <button 
            className="btn-primary" 
            style={{ 
              width: 'auto', 
              backgroundColor: isDangerous ? 'var(--red-button)' : 'var(--primary)' 
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}