import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface CityAutocompleteProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function CityAutocomplete({ value, onChange, placeholder }: CityAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const wrapperRef = useRef<HTMLDivElement>(null)

    // FIX 1: Semaforo per evitare la ricerca dopo il click
    const skipSearchRef = useRef(false)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        // Se il semaforo è rosso (abbiamo appena cliccato), resettalo e non cercare
        if (skipSearchRef.current) {
            skipSearchRef.current = false
            return
        }

        const timer = setTimeout(async () => {
            if (value.length < 2) {
                setSuggestions([])
                return
            }

            setIsLoading(true)
            try {
                const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=it&format=json`)
                const data = await response.json()
                setSuggestions(data.results || [])
                setIsOpen(true)
            } catch (error) {
                console.error("Errore autocomplete:", error)
            } finally {
                setIsLoading(false)
            }
        }, 400)

        return () => clearTimeout(timer)
    }, [value])

    const handleSelect = (item: any) => {
        const fullName = item.country ? `${item.name}, ${item.country}` : item.name

        // FIX 1: Attiva il semaforo prima di cambiare il valore
        skipSearchRef.current = true

        onChange(fullName)
        setIsOpen(false)
        setSuggestions([])
    }

    return (
        // FIX 2: Layout relativo stabile
        <div className="relative w-full" ref={wrapperRef} style={{ zIndex: 50 }}>
            <div className="relative">
                <input
                    className="input-field"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        if (e.target.value.length >= 2) setIsOpen(true)
                    }}
                    placeholder={placeholder}
                    // Altezza fissa e box-sizing per evitare saltelli
                    style={{ width: '100%', boxSizing: 'border-box', height: '42px' }}
                />

                {/* Spinner posizionato in modo assoluto, non occupa spazio nel flusso */}
                {isLoading && (
                    <div
                        className="absolute right-3 animate-spin text-gray-400"
                        style={{ top: '50%', transform: 'translateY(-50%)' }} // Centratura verticale perfetta
                    >
                        <Loader2 size={18} />
                    </div>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div
                    className="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl overflow-y-auto"
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d6d3d1',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        maxHeight: '200px',
                        zIndex: 100, // Altissimo per stare sopra al footer della modale
                        left: 0
                    }}
                >
                    {suggestions.map((item) => (
                        <div
                            key={item.id}
                            className="px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF7ED'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <MapPin size={16} color="#C2410C" style={{ flexShrink: 0 }} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, color: '#292524', fontSize: '0.95rem' }}>
                                    {item.name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#78716C' }}>
                                    {item.country}
                                    {item.admin1 ? ` • ${item.admin1}` : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}