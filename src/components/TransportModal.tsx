import { useState } from 'react'
import { X, Plane, Train, Bus, Car, MapPin, Ship, ChevronDown } from 'lucide-react'

interface TransportModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: TransportData) => void
}

export interface TransportData {
    type: string
    from: string
    to: string
    number: string
}

const TRANSPORT_TYPES = [
    'Aereo', 'Treno', 'Autobus', 'Metro', 'Tram', 'Taxi', 'Nave', 'Altro'
]

export function TransportModal({ isOpen, onClose, onConfirm }: TransportModalProps) {
    const [data, setData] = useState<TransportData>({
        type: 'Aereo',
        from: '',
        to: '',
        number: ''
    })

    const [isSelectOpen, setIsSelectOpen] = useState(false)

    if (!isOpen) return null

    const handleSubmit = () => {
        onConfirm(data)
        setData({ type: 'Aereo', from: '', to: '', number: '' })
    }

    const getIcon = (type: string, size = 20) => {
        switch (type) {
            case 'Aereo': return <Plane size={size} className="text-blue-500" />;
            case 'Treno':
            case 'Metro':
            case 'Tram': return <Train size={size} className="text-orange-500" />;
            case 'Autobus': return <Bus size={size} className="text-green-500" />;
            case 'Taxi': return <Car size={size} className="text-yellow-500" />;
            case 'Nave': return <Ship size={size} className="text-blue-700" />;
            default: return <MapPin size={size} className="text-gray-500" />;
        }
    }

    return (
        <div className="modal-overlay" onClick={() => setIsSelectOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Dettagli Trasporto
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="input-group">

                    {/* TYPE (REQUIRED) */}
                    <div className='input-subgroup'>
                        <label style={{ fontWeight: 700, marginBottom: 5 }}>Mezzo di trasporto *</label>

                        <div className="custom-select-container">
                            {/* Il "bottone" che mostra il valore corrente */}
                            <div
                                className={`custom-select-trigger ${isSelectOpen ? 'open' : ''}`}
                                onClick={() => setIsSelectOpen(!isSelectOpen)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Mostriamo l'icona anche dentro la select chiusa */}
                                    {getIcon(data.type, 18)}
                                    {data.type}
                                </div>
                                <ChevronDown size={16} color="var(--text-muted)" />
                            </div>

                            {/* La tendina che appare */}
                            {isSelectOpen && (
                                <div className="custom-select-dropdown">
                                    {TRANSPORT_TYPES.map((t) => (
                                        <div
                                            key={t}
                                            className={`custom-select-option ${data.type === t ? 'selected' : ''}`}
                                            onClick={() => {
                                                setData({ ...data, type: t })
                                                setIsSelectOpen(false) // Chiudi dopo la selezione
                                            }}
                                        >
                                            {getIcon(t, 16)}
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FROM / TO */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: 700, marginBottom: 5, fontSize: '0.9rem' }}>Da (Partenza)</label>
                            <input
                                className="input-field"
                                placeholder="Es. Roma"
                                value={data.from}
                                onChange={(e) => setData({ ...data, from: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: 700, marginBottom: 5, fontSize: '0.9rem' }}>A (Arrivo)</label>
                            <input
                                className="input-field"
                                placeholder="Es. Milano"
                                value={data.to}
                                onChange={(e) => setData({ ...data, to: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* NUMBER */}
                    <div className='input-subgroup' style={{ marginTop: '10px' }}>
                        <label style={{ fontWeight: 700, marginBottom: 5 }}>Numero / Sigla</label>
                        <input
                            className="input-field"
                            placeholder="Es. FR1234, Italo 9988"
                            value={data.number}
                            onChange={(e) => setData({ ...data, number: e.target.value })}
                        />
                    </div>

                </div>

                <div className="modal-footer" style={{ marginTop: '25px' }}>
                    <button className="back-btn" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>Annulla</button>
                    <button className="btn-primary" onClick={handleSubmit}>Continua</button>
                </div>
            </div>
        </div>
    )
}