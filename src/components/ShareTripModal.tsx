import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { X, UserPlus, Trash2, Users } from 'lucide-react'
import { ErrorMessage } from './ui/ErrorMessage'

interface ShareTripModalProps {
    isOpen: boolean
    onClose: () => void
    tripId: string
}

export function ShareTripModal({ isOpen, onClose, tripId }: ShareTripModalProps) {
    const [loading, setLoading] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const [collaborators, setCollaborators] = useState<any[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen, tripId])

    const fetchData = async () => {
        setLoading(true)
        setError('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: collabs, error: collErr } = await supabase
                .from('trip_collaborators')
                .select('id, user:user_id(id, email, full_name, avatar_url)')
                .eq('trip_id', tripId)

            if (collErr) throw collErr
            setCollaborators(collabs || [])

            const { data: friendships, error: friendErr } = await supabase
                .from('friendships')
                .select(`
          id,
          sender:sender_id(id, email, full_name, avatar_url),
          receiver:receiver_id(id, email, full_name, avatar_url)
        `)
                .eq('status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

            if (friendErr) throw friendErr

            const myFriends = friendships?.map((f: any) => {
                return f.sender.id === user.id ? f.receiver : f.sender
            }) || []

            setFriends(myFriends)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const addCollaborator = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('trip_collaborators')
                .insert([{ trip_id: tripId, user_id: userId }])

            if (error) throw error
            fetchData()
        } catch (err: any) {
            setError(err.message)
        }
    }

    const removeCollaborator = async (collabId: string) => {
        if (!confirm('Rimuovere questo collaboratore?')) return
        try {
            const { error } = await supabase
                .from('trip_collaborators')
                .delete()
                .eq('id', collabId)

            if (error) throw error
            fetchData()
        } catch (err: any) {
            setError(err.message)
        }
    }

    if (!isOpen) return null

    const availableFriends = friends.filter(friend =>
        !collaborators.some(c => c.user.id === friend.id)
    )

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Users className="text-blue-500" /> Condividi Viaggio
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <ErrorMessage message={error} />

                <div style={{ overflowY: 'auto', paddingRight: 5 }}>

                    <h4 style={{ color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
                        Collaboratori ({collaborators.length})
                    </h4>

                    {collaborators.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: '0.9rem' }}>Nessun collaboratore. Viaggi da solo?</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 25 }}>
                            {collaborators.map(c => (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <img src={c.user.avatar_url || 'https://via.placeholder.com/30'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.user.full_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.user.email}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeCollaborator(c.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }} title="Rimuovi">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

                    <h4 style={{ color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
                        Invita Amici ({availableFriends.length})
                    </h4>

                    {loading ? <p>Caricamento...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {availableFriends.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                    Non hai amici da invitare o sono già tutti qui. <br />
                                    Aggiungi nuovi amici dalla Dashboard!
                                </p>
                            ) : (
                                availableFriends.map(friend => (
                                    <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <img src={friend.avatar_url || 'https://via.placeholder.com/30'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{friend.full_name}</div>
                                        </div>
                                        <button
                                            onClick={() => addCollaborator(friend.id)}
                                            className="btn-primary"
                                            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                                        >
                                            <UserPlus size={14} /> Aggiungi
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}