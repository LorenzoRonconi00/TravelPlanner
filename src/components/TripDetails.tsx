import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { Calendar, ArrowLeft, Plane, Hotel, Coffee, Landmark, Ticket, Trash2, Clock, Download, X } from 'lucide-react'
import { DndContext, useDraggable, useDroppable, DragOverlay, DragEndEvent, DragStartEvent } from '@dnd-kit/core'

// LIBRERIE PDF (Quelle sicure)
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- TIPI ---
interface TripDetailsProps { tripId: string; onBack: () => void }
interface Day { id: string; date: string; day_number: number }
interface Activity { id: string; title: string; type: string; start_time: string | null; duration_minutes: number | null; notes: string | null; day_id?: string }

const ACTIVITY_TYPES = [
    { type: 'culture', label: 'Cultura', icon: <Landmark size={20} /> },
    { type: 'food', label: 'Cibo', icon: <Coffee size={20} /> },
    { type: 'transport', label: 'Volo', icon: <Plane size={20} /> },
    { type: 'hotel', label: 'Hotel/Appartamento', icon: <Hotel size={20} /> },
    { type: 'leisure', label: 'Svago', icon: <Ticket size={20} /> },
]

// --- SOTTO-COMPONENTI DND (Drag and Drop) ---
function DraggableToolItem({ type, label, icon }: { type: string, label: string, icon: any }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `tool-${type}`, data: { type, label } })
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`tool-item ${isDragging ? 'dragging' : ''}`}>
            {icon}<span>{label}</span>
        </div>
    )
}

function DroppableTimeline({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'timeline-drop-zone' })
    const style = {
        backgroundColor: isOver ? 'var(--primary-light)' : 'transparent',
        borderColor: isOver ? 'var(--primary)' : '#D6D3D1',
        flex: 1, display: 'flex', flexDirection: 'column' as const, minHeight: '400px',
        borderRadius: '16px', transition: 'all 0.2s', borderWidth: '2px', borderStyle: 'dashed', padding: '20px'
    }
    return <div ref={setNodeRef} style={style}>{children}</div>
}

// --- COMPONENTE PRINCIPALE ---
export default function TripDetails({ tripId, onBack }: TripDetailsProps): JSX.Element {
    const [days, setDays] = useState<Day[]>([])
    const [selectedDay, setSelectedDay] = useState<Day | null>(null)
    const [activities, setActivities] = useState<Activity[]>([])
    const [tripInfo, setTripInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [activeDragItem, setActiveDragItem] = useState<any>(null)

    // Stati Modale Modifica/Creazione
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
    const [activityForm, setActivityForm] = useState({ type: '', title: '', startTime: '', duration: 60, notes: '' })

    useEffect(() => { fetchTripAndDays() }, [tripId])
    useEffect(() => { if (selectedDay) fetchActivities(selectedDay.id) }, [selectedDay])

    // --- CARICAMENTO DATI ---
    const fetchTripAndDays = async () => {
        setLoading(true)
        const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
        setTripInfo(tripData)
        const { data: daysData } = await supabase.from('days').select('*').eq('trip_id', tripId).order('day_number', { ascending: true })
        if (daysData && daysData.length > 0) { setDays(daysData); setSelectedDay(daysData[0]) }
        setLoading(false)
    }

    const fetchActivities = async (dayId: string) => {
        const { data } = await supabase.from('activities').select('*').eq('day_id', dayId).order('start_time', { ascending: true })
        setActivities(data || [])
    }

    // --- FUNZIONE EXPORT PDF (NATIVA) ---
    const handleExportPdf = async () => {
        setExporting(true)
        try {
            // 1. Scarica TUTTE le attività di tutti i giorni
            const dayIds = days.map(d => d.id)
            const { data: allActivities } = await supabase.from('activities').select('*').in('day_id', dayIds).order('start_time', { ascending: true })
            if (!allActivities) throw new Error('Nessun dato da esportare')

            // 2. Crea il PDF
            const doc = new jsPDF()

            // Sfondo Pagina (Crema)
            doc.setFillColor(255, 247, 237); doc.rect(0, 0, 210, 297, 'F');

            // Intestazione
            doc.setFont('times', 'bold'); doc.setTextColor(194, 65, 12); doc.setFontSize(24);
            doc.text(tripInfo.title, 14, 20)

            doc.setFont('helvetica', 'normal'); doc.setTextColor(80); doc.setFontSize(12);
            doc.text(`${tripInfo.destination} • ${new Date(tripInfo.start_date).toLocaleDateString()} - ${new Date(tripInfo.end_date).toLocaleDateString()}`, 14, 28)
            if (tripInfo.accommodation_info) doc.text(tripInfo.accommodation_info, 14, 34)

            let yPos = 45

            // Loop per ogni giorno
            days.forEach((day) => {
                const dayActs = allActivities.filter((a: any) => a.day_id === day.id)

                // Titolo Giorno
                doc.setFont('times', 'bold'); doc.setTextColor(67, 20, 7); doc.setFontSize(14);
                doc.text(`Giorno ${day.day_number} - ${new Date(day.date).toLocaleDateString()}`, 14, yPos)
                yPos += 5

                if (dayActs.length > 0) {
                    // Tabella Attività
                    autoTable(doc, {
                        startY: yPos,
                        body: dayActs.map((act: any) => [
                            act.start_time ? act.start_time.slice(0, 5) : '--:--',
                            `${act.title} (${act.duration_minutes} min)\n${act.notes || ''}`
                        ]),
                        theme: 'grid',
                        styles: { fillColor: [255, 255, 255], textColor: [60, 60, 60], fontSize: 10 },
                        columnStyles: { 0: { fontStyle: 'bold', textColor: [194, 65, 12], cellWidth: 20 } },
                        margin: { left: 14, right: 14 }
                    })
                    // @ts-ignore
                    yPos = doc.lastAutoTable.finalY + 15
                } else {
                    doc.setFontSize(10); doc.setTextColor(150); doc.text('Nessuna attività', 14, yPos + 5); yPos += 15
                }

                // Nuova pagina se serve
                if (yPos > 270) { doc.addPage(); doc.setFillColor(255, 247, 237); doc.rect(0, 0, 210, 297, 'F'); yPos = 20; }
            })

            doc.save(`${tripInfo.title.replace(/\s+/g, '_')}.pdf`)
        } catch (e: any) { alert('Errore PDF: ' + e.message) } finally { setExporting(false) }
    }

    // --- GESTIONE ATTIVITÀ (CRUD) ---
    const handleDelete = async (e: any, id: string) => {
        e.stopPropagation(); if (!confirm('Eliminare?')) return;
        await supabase.from('activities').delete().eq('id', id); if (selectedDay) fetchActivities(selectedDay.id)
    }
    const openEdit = (act: Activity) => {
        setEditingActivityId(act.id); setActivityForm({ type: act.type, title: act.title, startTime: act.start_time ? act.start_time.slice(0, 5) : '', duration: act.duration_minutes || 60, notes: act.notes || '' }); setShowActivityModal(true)
    }
    const handleSave = async () => {
        if (!selectedDay) return

        if (!activityForm.title || !activityForm.startTime) {
            return alert('Devi inserire un Titolo e un Orario di inizio!')
        }

        const payload = { type: activityForm.type, title: activityForm.title, start_time: activityForm.startTime || null, duration_minutes: activityForm.duration, notes: activityForm.notes, day_id: selectedDay.id }
        if (editingActivityId) await supabase.from('activities').update(payload).eq('id', editingActivityId); else await supabase.from('activities').insert([payload]);
        setShowActivityModal(false); fetchActivities(selectedDay.id)
    }

    // --- HANDLERS DRAG & DROP ---
    const handleDragStart = (e: DragStartEvent) => { const tool = ACTIVITY_TYPES.find(t => t.type === e.active.data.current?.type); if (tool) setActiveDragItem(tool) }
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDragItem(null);
        // Se rilasciato nella zona giusta
        if (e.over && e.over.id === 'timeline-drop-zone' && selectedDay && e.active.data.current?.type) {
            setEditingActivityId(null);
            setActivityForm({ type: e.active.data.current.type, title: e.active.data.current.label, startTime: '', duration: 60, notes: '' });
            setShowActivityModal(true) // Apre modale creazione
        }
    }

    if (loading) return <div className="dashboard-content">Caricamento...</div>

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="planner-container">
                {/* 1. Sidebar Giorni */}
                <div className="sidebar-days">
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border-color)' }}>
                        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /> Indietro</button>
                    </div>
                    {days.map(day => (
                        <div key={day.id} className={`day-item ${selectedDay?.id === day.id ? 'active' : ''}`} onClick={() => setSelectedDay(day)}>
                            <Calendar size={20} />
                            <div><div className="day-number">Giorno {day.day_number}</div><div className="day-date">{new Date(day.date).toLocaleDateString()}</div></div>
                        </div>
                    ))}
                </div>

                {/* 2. Timeline Centrale */}
                <div className="timeline-area">
                    {selectedDay && (
                        <>
                            <div className="timeline-header">
                                <div><h1 style={{ margin: 0 }}>Giorno {selectedDay.day_number}</h1></div>
                                <button onClick={handleExportPdf} disabled={exporting} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', display: 'flex', gap: 5 }}><Download size={18} /> PDF</button>
                            </div>
                            <DroppableTimeline>
                                {activities.length === 0 ? <div style={{ color: 'var(--text-muted)', margin: 'auto' }}>Trascina le attività qui</div> : activities.map(act => (
                                    <div key={act.id} className="activity-card" onClick={() => openEdit(act)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                                            <div style={{ color: 'var(--primary)', background: 'var(--primary-light)', padding: 8, borderRadius: '50%' }}>
                                                {ACTIVITY_TYPES.find(t => t.type === act.type)?.icon}
                                            </div>
                                            <div className="activity-info"><h4>{act.title}</h4><div className="activity-meta"><Clock size={12} /> {act.start_time?.slice(0, 5) || '--:--'} • {act.duration_minutes} min</div></div>
                                        </div>
                                        <button className="delete-btn" onClick={(e) => handleDelete(e, act.id)}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </DroppableTimeline>
                        </>
                    )}
                </div>

                {/* 3. Sidebar Attività */}
                <div className="sidebar-tools">
                    <h3 style={{ margin: '0 0 20px 0' }}>Attività</h3>
                    {ACTIVITY_TYPES.map(t => <DraggableToolItem key={t.type} type={t.type} label={t.label} icon={t.icon} />)}
                </div>

                {/* 4. Overlay Visivo */}
                <DragOverlay>{activeDragItem && <div className="drag-overlay-item">{activeDragItem.icon}<span>{activeDragItem.label}</span></div>}</DragOverlay>

                {/* 5. Modal */}
                {showActivityModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            {/* Header Modal */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
                                    {editingActivityId ? 'Modifica' : 'Nuova'} Attività
                                </h2>
                                <button onClick={() => setShowActivityModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Campi Input */}
                            <div className="input-group">
                                <div className='input-subgroup'>
                                    <label style={{ fontWeight: 700, marginBottom: 5 }}>Titolo *</label>
                                    <input
                                        className="input-field"
                                        value={activityForm.title}
                                        onChange={e => setActivityForm({ ...activityForm, title: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                {/* Riga Ora e Durata */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '15px' }}>

                                    {/* Colonna 1: Ora Inizio */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            Ora Inizio *
                                        </label>
                                        <input
                                            type="time"
                                            className="input-field"
                                            style={{ width: '80%', margin: 0, cursor: 'pointer' }}
                                            value={activityForm.startTime}
                                            onChange={e => setActivityForm({ ...activityForm, startTime: e.target.value })}
                                            onClick={(e) => {
                                                try {
                                                    (e.currentTarget as any).showPicker()
                                                } catch (error) {
                                                    console.error(error)
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Colonna 2: Durata */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            Durata (min)
                                        </label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            style={{ width: '100%', margin: 0 }}
                                            value={activityForm.duration}
                                            onChange={e => setActivityForm({ ...activityForm, duration: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>

                                </div>

                                <div className='input-subgroup'>
                                    <label style={{ fontWeight: 700, marginBottom: 5, marginTop: 10 }}>Note</label>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        value={activityForm.notes}
                                        onChange={e => setActivityForm({ ...activityForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Footer con Annulla e Salva */}
                            <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 25 }}>
                                <button
                                    className="back-btn"
                                    style={{ border: 'none', background: 'transparent' }}
                                    onClick={() => setShowActivityModal(false)}
                                >
                                    Annulla
                                </button>
                                <button className="btn-primary" onClick={handleSave}>
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    )
}