import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { X, Users, Inbox, Search, Check, Trash2, Send, Loader2, Map } from 'lucide-react'
import { ConfirmationModal } from './ui/ConfirmationModal'

interface FriendsModalProps {
    isOpen: boolean
    onClose: () => void
    counts: { friends: number; trips: number }
    onUpdate: () => void
}

type Tab = 'all' | 'pending' | 'add' | 'collaborations'

export function FriendsModal({ isOpen, onClose, counts, onUpdate }: FriendsModalProps) {

    //#region STATE & EFFECTS

    const [activeTab, setActiveTab] = useState<Tab>('all')
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [friends, setFriends] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [addFriendEmail, setAddFriendEmail] = useState('')

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [friendshipIdToDelete, setFriendshipIdToDelete] = useState<string | null>(null)

    const [tripInvites, setTripInvites] = useState<any[]>([])

    const getMyId = async () => (await supabase.auth.getUser()).data.user?.id

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'all') fetchFriends()
            if (activeTab === 'pending') fetchRequests()
            if (activeTab === 'collaborations') fetchTripInvites()
            setMsg(null)
        }
    }, [isOpen, activeTab])

    //#endregion

    //#region FETCH

    const fetchFriends = async () => {
        setLoading(true)
        const myId = await getMyId()
        const { data, error } = await supabase
            .from('friendships')
            .select(`id, sender:sender_id(id, email, full_name, avatar_url), receiver:receiver_id(id, email, full_name, avatar_url)`)
            .eq('status', 'accepted')
            .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)

        if (!error && data) {
            setFriends(data.map((f: any) => ({
                friendship_id: f.id,
                profile: f.sender.id === myId ? f.receiver : f.sender
            })))
        }
        setLoading(false)
    }

    const fetchRequests = async () => {
        setLoading(true)
        const myId = await getMyId()
        const { data, error } = await supabase
            .from('friendships')
            .select(`id, sender:sender_id(id, email, full_name, avatar_url)`)
            .eq('receiver_id', myId)
            .eq('status', 'pending')

        if (!error && data) setRequests(data)
        setLoading(false)
    }

    const fetchTripInvites = async () => {
        setLoading(true)
        const myId = await getMyId()

        const { data, error } = await supabase
            .from('trip_collaborators')
            .select(`
        id,
        trip:trip_id ( id, title, destination, start_date, end_date, image_url )
      `)
            .eq('user_id', myId)
            .eq('status', 'pending')

        if (!error && data) setTripInvites(data)
        setLoading(false)
    }

    //#endregion

    //#region ACTIONS

    const sendRequest = async () => {
        setMsg(null); setLoading(true); const myId = await getMyId()
        if (!addFriendEmail.includes('@') || addFriendEmail === (await supabase.auth.getUser()).data.user?.email) {
            setMsg({ type: 'error', text: 'Email non valida' }); setLoading(false); return
        }
        try {
            const { data: profiles, error: rpcError } = await supabase.rpc('get_profile_by_email', { target_email: addFriendEmail })
            if (rpcError || !profiles?.length) throw new Error('Utente non trovato.')
            const { error: insertError } = await supabase.from('friendships').insert([{ sender_id: myId, receiver_id: profiles[0].id }])
            if (insertError) throw new Error('Richiesta già inviata o siete già amici.')
            setMsg({ type: 'success', text: 'Richiesta inviata!' }); setAddFriendEmail('')
        } catch (err: any) { setMsg({ type: 'error', text: err.message }) }
        finally { setLoading(false) }
    }

    const handleAction = async (friendshipId: string, action: 'accept' | 'delete') => {
        if (action === 'delete') {
            setFriendshipIdToDelete(friendshipId); setShowDeleteModal(true)
        } else {
            await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
            refreshData()
        }
    }

    const confirmDelete = async () => {
        if (!friendshipIdToDelete) return
        await supabase.from('friendships').delete().eq('id', friendshipIdToDelete)
        refreshData()
        setShowDeleteModal(false); setFriendshipIdToDelete(null)
    }

    const refreshData = () => {
        if (activeTab === 'pending') fetchRequests()
        if (activeTab === 'all') fetchFriends()
        onUpdate()
    }

    const handleTripInviteAction = async (collabId: string, action: 'accept' | 'reject') => {
        try {
            let error = null

            if (action === 'accept') {
                const res = await supabase.from('trip_collaborators').update({ status: 'accepted' }).eq('id', collabId)
                error = res.error
            } else {
                const res = await supabase.from('trip_collaborators').delete().eq('id', collabId)
                error = res.error
            }

            if (error) throw error

            fetchTripInvites()
            onUpdate()


        } catch (err: any) {
            console.error("Errore azione invito:", err)
            alert("Impossibile completare l'azione: " + err.message)
        }
    }

    if (!isOpen) return null

    //#endregion

    return (
        <div className="modal-overlay">
            <div className="friends-modal-layout">

                {/* HEADER */}
                <div className="friends-header">
                    <div className="friends-title-group">
                        <div className="friends-main-title"><Users /> Amici</div>

                        <div className={`friends-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                            Tutti
                        </div>

                        <div className={`friends-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                            In Attesa
                            {counts.friends > 0 && (
                                <span className="friends-badge">{counts.friends}</span>
                            )}
                        </div>

                        <div className={`friends-tab ${activeTab === 'collaborations' ? 'active' : ''}`} onClick={() => setActiveTab('collaborations')}>
                            Collaborazioni
                            {counts.trips > 0 && (
                                <span className="friends-badge">{counts.trips}</span>
                            )}
                        </div>

                        <div className={`friends-tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
                            <span style={{ color: activeTab === 'add' ? 'white' : '#16a34a' }}>Aggiungi</span>
                        </div>
                    </div>

                    <button className="close-header-btn" onClick={onClose}><X size={24} /></button>
                </div>

                {/* BODY */}
                <div className="friends-body">

                    {/* ALL TAB */}
                    {activeTab === 'all' && (
                        <div>
                            <div className="input-group" style={{ marginBottom: '20px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                    <input className="input-field" placeholder="Cerca amici..." style={{ paddingLeft: '40px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                            </div>

                            {loading ? <p>Caricamento...</p> : (
                                <div className="friend-list">
                                    {friends.filter(f => f.profile.email.includes(searchQuery) || f.profile.full_name?.includes(searchQuery)).map((item) => (
                                        <div key={item.friendship_id} className="friend-item">
                                            <div className="friend-info-group">
                                                <img src={item.profile.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" className="friend-avatar-small" referrerPolicy="no-referrer" />
                                                <div>
                                                    <div className="friend-name">{item.profile.full_name || 'Utente'}</div>
                                                    <div className="friend-email">{item.profile.email}</div>
                                                </div>
                                            </div>
                                            <button className="friend-action-btn delete" onClick={() => handleAction(item.friendship_id, 'delete')} title="Rimuovi">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {friends.length === 0 && (
                                        <div className="friends-empty-state">
                                            <Users size={48} className="friends-empty-icon" />
                                            <p>Non hai ancora amici. Aggiungine uno!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* PENDING TAB */}
                    {activeTab === 'pending' && (
                        <div>
                            <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Richieste in arrivo — {requests.length}</h3>
                            {loading ? <p>Caricamento...</p> : (
                                <div className="friend-list" style={{ marginTop: 20 }}>
                                    {requests.map((req) => (
                                        <div key={req.id} className="friend-item pending-bg">
                                            <div className="friend-info-group">
                                                <img src={req.sender.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" className="friend-avatar-small" referrerPolicy="no-referrer" />
                                                <div>
                                                    <div className="friend-name">{req.sender.full_name || 'Utente'}</div>
                                                    <div className="friend-email">{req.sender.email}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button className="friend-action-btn accept" onClick={() => handleAction(req.id, 'accept')}>
                                                    <Check size={18} /> Accetta
                                                </button>
                                                <button className="friend-action-btn delete" onClick={() => handleAction(req.id, 'delete')}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {requests.length === 0 && (
                                        <div className="friends-empty-state">
                                            <Inbox size={48} className="friends-empty-icon" />
                                            <p>Nessuna richiesta in sospeso.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* COLLABORATIONS TAB */}
                    {activeTab === 'collaborations' && (
                        <div>
                            <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Inviti ai Viaggi
                            </h3>

                            {loading ? <p>Caricamento...</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: 20 }}>
                                    {tripInvites.map((invite) => (
                                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#FFF7ED' }}>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' }}>
                                                    {invite.trip.image_url ? (
                                                        <img src={invite.trip.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <Map size={24} style={{ margin: '13px', color: '#ccc' }} />
                                                    )}
                                                </div>

                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{invite.trip.title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {invite.trip.destination} • {new Date(invite.trip.start_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => handleTripInviteAction(invite.id, 'accept')} className="friend-action-btn accept">
                                                    <Check size={18} /> Partecipa
                                                </button>
                                                <button onClick={() => handleTripInviteAction(invite.id, 'reject')} className="friend-action-btn delete">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {tripInvites.length === 0 && (
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
                                            Nessun invito di viaggio in sospeso.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    {/* ADD TAB */}
                    {activeTab === 'add' && (
                        <div>
                            <h2 style={{ marginTop: 0, color: 'var(--text-main)' }}>Aggiungi un amico</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Inserisci l'indirizzo email esatto per inviare una richiesta.</p>

                            <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    className="input-field"
                                    placeholder="email@esempio.com"
                                    value={addFriendEmail}
                                    onChange={(e) => { setAddFriendEmail(e.target.value); setMsg(null); }}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn-primary"
                                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={sendRequest}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    Invia
                                </button>
                            </div>

                            {msg && (
                                <div className={`friend-feedback ${msg.type}`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Rimuovi"
                message={activeTab === 'pending' ? "Rifiutare questa richiesta?" : "Rimuovere questo amico?"}
                confirmText={activeTab === 'pending' ? "Rifiuta" : "Rimuovi"}
                isDangerous={true}
            />
        </div>
    )
}