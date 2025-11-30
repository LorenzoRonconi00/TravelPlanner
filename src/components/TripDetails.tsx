import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { Calendar, ArrowLeft, Plane, Hotel, Coffee, Landmark, Ticket, Trash2, Clock, Download, X, Lightbulb, Sparkles, Plus } from 'lucide-react'
import { DndContext, useDraggable, useDroppable, DragOverlay, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { ErrorMessage } from './ui/ErrorMessage'
import { ConfirmationModal } from './ui/ConfirmationModal'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Types
interface TripDetailsProps {
    tripId: string;
    onBack: () => void
}

interface Day {
    id: string;
    date: string;
    day_number: number
}

interface Activity {
    id: string;
    title: string;
    type: string;
    start_time: string | null;
    duration_minutes: number | null;
    notes: string | null;
    day_id?: string
}

const ACTIVITY_TYPES = [
    { type: 'culture', label: 'Cultura', icon: <Landmark size={20} /> },
    { type: 'food', label: 'Cibo', icon: <Coffee size={20} /> },
    { type: 'transport', label: 'Volo', icon: <Plane size={20} /> },
    { type: 'hotel', label: 'Hotel/Appartamento', icon: <Hotel size={20} /> },
    { type: 'leisure', label: 'Svago', icon: <Ticket size={20} /> },
]

const TRIP_MOODS = [
    "insolite e poco conosciute (gemme nascoste)",
    "rilassanti e panoramiche",
    "tipiche, tradizionali e gastronomiche",
    "culturali, storiche e artistiche",
    "divertenti e sociali",
    "romantiche e suggestive"
]

// Drag & Drop Components
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


export default function TripDetails({ tripId, onBack }: TripDetailsProps): JSX.Element {
    const [days, setDays] = useState<Day[]>([])
    const [selectedDay, setSelectedDay] = useState<Day | null>(null)
    const [activities, setActivities] = useState<Activity[]>([])
    const [tripInfo, setTripInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [activeDragItem, setActiveDragItem] = useState<any>(null)

    const [showActivityModal, setShowActivityModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [activityToDelete, setActivityToDelete] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [aiError, setAiError] = useState('')
    const [pdfError, setPdfError] = useState('')
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
    const [activityForm, setActivityForm] = useState({ type: '', title: '', startTime: '', duration: 60, notes: '' })

    const [showAssistant, setShowAssistant] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
    const [hotelInput, setHotelInput] = useState('')

    useEffect(() => { fetchTripAndDays() }, [tripId])
    useEffect(() => { if (selectedDay) fetchActivities(selectedDay.id) }, [selectedDay])

    // Fetch trip info and days
    const fetchTripAndDays = async () => {
        setLoading(true)
        const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
        setTripInfo(tripData)
        const { data: daysData } = await supabase.from('days').select('*').eq('trip_id', tripId).order('day_number', { ascending: true })
        if (daysData && daysData.length > 0) { setDays(daysData); setSelectedDay(daysData[0]) }
        setLoading(false)
    }

    // Fetch activities for a specific day
    const fetchActivities = async (dayId: string) => {
        const { data } = await supabase.from('activities').select('*').eq('day_id', dayId).order('start_time', { ascending: true })
        setActivities(data || [])
    }

    // Function to call Gemini API
    const askGemini = async (destination: string, accommodation: string, exclusions: string[], mood: string) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Manca la API Key di Gemini");

        const exclusionText = exclusions.length > 0
            ? `IMPORTANTE: NON suggerire assolutamente le seguenti attività perché l'utente le ha già: ${exclusions.join(', ')}.`
            : '';

        const prompt = `
      Sei una guida locale esperta di ${destination}.
      L'utente alloggia presso: "${accommodation}".
      
      Suggerisci 5 attività che siano **${mood}**.
      ${exclusionText}
      
      Rispondi SOLO con un array JSON valido.
      Per il campo "cost": DEVI inserire una stima (es. "Gratis", "€15").
      
      Formato richiesto:
      [
        {
          "title": "Nome Attività",
          "description": "Descrizione max 20 parole",
          "duration": 60,
          "cost": "Gratis o Prezzo", 
          "type": "culture" 
        }
      ]
      (type: 'culture', 'food', 'leisure', 'transport')
    `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Errore Gemini');
        }

        const data = await response.json();
        let textResponse = data.candidates[0].content.parts[0].text;


        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(textResponse);
    }

    // Handle AI Assistant Request
    const handleAskAssistant = async () => {
        setAiError('');
        setAiLoading(true);
        const accommodation = tripInfo.accommodation_info
            ? tripInfo.accommodation_info.replace('Alloggio: ', '').split('|')[0]
            : hotelInput;

        if (!accommodation) {
            setAiError("Inserisci il nome dell'hotel o la zona per avere suggerimenti precisi!");
            setAiLoading(false);
            return;
        }

        try {
            const existingTitles = activities.map(a => a.title);
            const suggestedTitles = aiSuggestions.map(s => s.title);

            const exclusions = [...existingTitles, ...suggestedTitles];

            const randomMood = TRIP_MOODS[Math.floor(Math.random() * TRIP_MOODS.length)];

            const newSuggestions = await askGemini(tripInfo.destination, accommodation, exclusions, randomMood);

            setAiSuggestions(newSuggestions);

        } catch (e: any) {
            console.error(e);
            setAiError("Errore AI: " + e.message);
        } finally {
            setAiLoading(false);
        }
    };

    // Function to add suggestion to activities
    const handleAddSuggestion = (suggestion: any) => {
        setEditingActivityId(null);
        setActivityForm({
            type: suggestion.type || 'leisure',
            title: suggestion.title,
            startTime: '',
            duration: suggestion.duration,
            notes: `${suggestion.description}\n\nCosto: ${suggestion.cost}`
        });
        setShowActivityModal(true);
    };

    // Helper function to get base64 image from URL
    const getBase64ImageFromURL = async (url: string): Promise<string | null> => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Errore caricamento immagine PDF", e);
            return null;
        }
    };

    // Export PDF function
    const handleExportPdf = async () => {
        setPdfError('');
        setExporting(true)
        try {
            const dayIds = days.map(d => d.id)
            const { data: allActivities } = await supabase.from('activities').select('*').in('day_id', dayIds).order('start_time', { ascending: true })
            if (!allActivities) throw new Error('Nessun dato da esportare')

            const imageUrl = tripInfo.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';
            const base64Img = await getBase64ImageFromURL(imageUrl);

            const doc = new jsPDF()
            const pageWidth = 210;
            const headerHeight = 80;

            // HEADER
            if (base64Img) {
                try {
                    doc.addImage(base64Img, 'JPEG', 0, 0, pageWidth, headerHeight, undefined, 'FAST');
                } catch (e) {
                    doc.setFillColor(194, 65, 12);
                    doc.rect(0, 0, pageWidth, headerHeight, 'F');
                }
            } else {
                doc.setFillColor(194, 65, 12);
                doc.rect(0, 0, pageWidth, headerHeight, 'F');
            }

            doc.setGState(new (doc.GState as any)({ opacity: 0.4 }));
            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, pageWidth, headerHeight, 'F');
            doc.setGState(new (doc.GState as any)({ opacity: 1 }));

            const cardWidth = 120;
            const cardHeight = 40;
            const cardX = (pageWidth - cardWidth) / 2;
            const cardY = (headerHeight - cardHeight) / 2;

            doc.setGState(new (doc.GState as any)({ opacity: 0.7 }));
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setGState(new (doc.GState as any)({ opacity: 1 }));

            doc.setTextColor(67, 20, 7);
            doc.setFont('times', 'bold');
            doc.setFontSize(20);
            doc.text(tripInfo.title, pageWidth / 2, cardY + 15, { align: 'center', maxWidth: cardWidth - 10 });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateStr = `${new Date(tripInfo.start_date).toLocaleDateString()} - ${new Date(tripInfo.end_date).toLocaleDateString()}`;
            doc.text(`${tripInfo.destination.toUpperCase()} • ${dateStr}`, pageWidth / 2, cardY + 25, { align: 'center' });

            if (tripInfo.accommodation_info) {
                doc.setFontSize(9);
                doc.setTextColor(120);
                const cleanAccom = tripInfo.accommodation_info.replace('Alloggio: ', '');
                doc.text(cleanAccom, pageWidth / 2, cardY + 33, { align: 'center', maxWidth: cardWidth - 10 });
            }

            // BODY
            let yPos = headerHeight + 15;

            days.forEach((day, index) => {
                const dayActs = allActivities.filter((a: any) => a.day_id === day.id)

                if (index > 0) {
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    doc.line(15, yPos - 8, pageWidth - 15, yPos - 8);
                }

                doc.setFont('times', 'bold');
                doc.setTextColor(194, 65, 12);
                doc.setFontSize(14);
                doc.text(`Giorno ${day.day_number}`, 14, yPos);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100);
                doc.setFontSize(10);
                doc.text(new Date(day.date).toLocaleDateString(), 40, yPos);

                yPos += 5;

                if (dayActs.length > 0) {
                    autoTable(doc, {
                        startY: yPos,
                        body: dayActs.map((act: any) => [
                            act.start_time ? act.start_time.slice(0, 5) : '--:--',
                            `${act.title} (${act.duration_minutes} min)\n${act.notes || ''}`
                        ]),
                        theme: 'grid',
                        styles: {
                            fillColor: [255, 255, 255],
                            textColor: [60, 60, 60],
                            fontSize: 10,
                            lineColor: [231, 229, 228],
                            lineWidth: 0.1
                        },
                        columnStyles: {
                            0: { fontStyle: 'bold', textColor: [194, 65, 12], cellWidth: 20, valign: 'top' }
                        },
                        margin: { left: 14, right: 14 }
                    })
                    // @ts-ignore
                    yPos = doc.lastAutoTable.finalY + 15
                } else {
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text('Nessuna attività pianificata.', 14, yPos + 8);
                    yPos += 20
                }

                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            })

            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Pagina ${i} di ${pageCount} - Creato con Travel Planner`, pageWidth / 2, 290, { align: 'center' });
            }

            doc.save(`${tripInfo.title.replace(/\s+/g, '_')}.pdf`)

        } catch (e: any) {
            console.error(e)
            setPdfError('Errore generazione PDF: ' + e.message)
        } finally {
            setExporting(false)
        }
    }

    // State handlers for delete modal
    const handleDelete = (e: any, id: string) => {
        e.stopPropagation()
        setActivityToDelete(id)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!activityToDelete) return

        await supabase.from('activities').delete().eq('id', activityToDelete)

        if (selectedDay) fetchActivities(selectedDay.id)

        setShowDeleteModal(false)
        setActivityToDelete(null)
    }

    // Open edit modal
    const openEdit = (act: Activity) => {
        setEditingActivityId(act.id); setActivityForm({ type: act.type, title: act.title, startTime: act.start_time ? act.start_time.slice(0, 5) : '', duration: act.duration_minutes || 60, notes: act.notes || '' }); setShowActivityModal(true)
    }

    // Save activity (new or edited)
    const handleSave = async () => {
        setErrorMsg('')

        if (!selectedDay) return
        if (!activityForm.title || !activityForm.startTime) {
            return setErrorMsg('Inserisci Titolo e Ora di inizio!')
        }

        // Check for time conflicts with existing activities
        const getMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        }

        const newStart = getMinutes(activityForm.startTime);
        const newEnd = newStart + activityForm.duration;

        const conflict = activities.find(act => {
            if (act.id === editingActivityId || !act.start_time) return false;

            const actStart = getMinutes(act.start_time.slice(0, 5));
            const actEnd = actStart + (act.duration_minutes || 0);

            return (newStart < actEnd && actStart < newEnd);
        });

        if (conflict) {
            return setErrorMsg(`Sovrapposizione con "${conflict.title}" (${conflict.start_time?.slice(0, 5)}).`);
        }

        const payload = {
            type: activityForm.type,
            title: activityForm.title,
            start_time: activityForm.startTime || null,
            duration_minutes: activityForm.duration,
            notes: activityForm.notes,
            day_id: selectedDay.id
        }

        if (editingActivityId) {
            await supabase.from('activities').update(payload).eq('id', editingActivityId)
        } else {
            await supabase.from('activities').insert([payload])
        }

        setShowActivityModal(false)
        fetchActivities(selectedDay.id)
    }

    // Handle Drag & Drop
    const handleDragStart = (e: DragStartEvent) => { const tool = ACTIVITY_TYPES.find(t => t.type === e.active.data.current?.type); if (tool) setActiveDragItem(tool) }
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDragItem(null);
        if (e.over && e.over.id === 'timeline-drop-zone' && selectedDay && e.active.data.current?.type) {
            setEditingActivityId(null);
            setActivityForm({ type: e.active.data.current.type, title: e.active.data.current.label, startTime: '', duration: 60, notes: '' });
            setShowActivityModal(true)
        }
    }

    if (loading) return <div className="dashboard-content">Caricamento...</div>

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="planner-container">
                {/* SIDEBAR */}
                <div className="sidebar-days">
                    <div style={{ padding: '25px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff' }}>

                        {/* BACK BUTTON */}
                        <button
                            className="back-to-trips"
                            onClick={onBack}
                        >
                            <ArrowLeft size={16} /> Torna ai viaggi
                        </button>

                        {/* DESTINATION */}
                        <h2 style={{
                            margin: 0,
                            marginTop: '10px',
                            color: 'var(--primary)',
                            fontSize: '1.8rem',
                            lineHeight: '1.2'
                        }}>
                            {tripInfo?.destination || 'Tua Destinazione'}
                        </h2>

                        {/* DAYS */}
                        <span style={{
                            display: 'block',
                            marginTop: '5px',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}>
                            {new Date(tripInfo?.start_date).toLocaleDateString()} - {new Date(tripInfo?.end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {days.map(day => (
                            <div key={day.id} className={`day-item ${selectedDay?.id === day.id ? 'active' : ''}`} onClick={() => setSelectedDay(day)}>
                                <Calendar size={20} />
                                <div>
                                    <div className="day-number">Giorno {day.day_number}</div>
                                    <div className="day-date">{new Date(day.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* AI BUTTON */}
                    <button
                        className="ai-fab"
                        onClick={() => {
                            setShowAssistant(true);
                            if (!tripInfo.accommodation_info) setHotelInput('');
                        }}
                        title="Chiedi all'AI"
                    >
                        <Lightbulb size={24} />
                    </button>

                    {/* DRAWER AI */}
                    {showAssistant && (
                        <div className="assistant-drawer">
                            <div className="assistant-header">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--primary)' }}>
                                        <Sparkles size={18} /> Assistente
                                    </h3>
                                    <button onClick={() => setShowAssistant(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                </div>

                                {!tripInfo.accommodation_info && (
                                    <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Dove alloggi?</label>
                                        <input
                                            className="input-field"
                                            style={{ padding: 8, fontSize: '0.9rem' }}
                                            placeholder="Hotel o Quartiere"
                                            value={hotelInput}
                                            onChange={e => setHotelInput(e.target.value)}
                                        />
                                    </div>
                                )}

                                <ErrorMessage message={aiError} />

                                <button
                                    className="btn-primary"
                                    style={{ fontSize: '0.9rem', padding: 8 }}
                                    onClick={handleAskAssistant}
                                    disabled={aiLoading}
                                >
                                    {aiLoading ? 'Sto pensando...' : 'Suggeriscimi Attività'}
                                </button>
                            </div>

                            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                                {aiSuggestions.map((sugg, i) => (
                                    <div key={i} className="ai-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{sugg.title}</h4>
                                            <span style={{ fontSize: '0.7rem', background: '#FFF7ED', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--primary)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                {sugg.cost || 'Prezzo var.'}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>{sugg.description}</p>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>⏱ {sugg.duration} min</span>
                                            <button
                                                onClick={() => handleAddSuggestion(sugg)}
                                                style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Aggiungi al piano"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {aiSuggestions.length === 0 && !aiLoading && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
                                        Clicca il bottone per ricevere 3 consigli su cosa fare in zona!
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* TIMELINE */}
                <div className="timeline-area">
                    {selectedDay && (
                        <>
                            <div className="timeline-header">
                                <div><h1 style={{ margin: 0 }}>Giorno {selectedDay.day_number}</h1></div>
                                <button onClick={handleExportPdf} disabled={exporting} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', display: 'flex', gap: 5 }}><Download size={18} /> PDF</button>
                            </div>

                            <ErrorMessage message={pdfError} />

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

                {/* ACTIVITIES SIDEBAR */}
                <div className="sidebar-tools">
                    <h3 style={{ margin: '0 0 20px 0' }}>Attività</h3>
                    {ACTIVITY_TYPES.map(t => <DraggableToolItem key={t.type} type={t.type} label={t.label} icon={t.icon} />)}
                </div>

                <DragOverlay>{activeDragItem && <div className="drag-overlay-item">{activeDragItem.icon}<span>{activeDragItem.label}</span></div>}</DragOverlay>

                {/* MODAL */}
                {showActivityModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
                                    {editingActivityId ? 'Modifica' : 'Nuova'} Attività
                                </h2>
                                <button onClick={() => setShowActivityModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

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

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '15px' }}>

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

                            <ErrorMessage message={errorMsg} />

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

                {/* DELETE MODAL */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDelete}
                    title="Elimina Attività"
                    message="Vuoi rimuovere questa attività dal programma?"
                    confirmText="Elimina"
                    isDangerous={true}
                />
            </div>
        </DndContext>
    )
}