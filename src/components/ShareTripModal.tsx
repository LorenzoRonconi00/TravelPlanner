import { useEffect, useState } from 'react'
import { supabase } from '../SupabaseClient'
import { X, UserPlus, Trash2, Users, LogOut } from 'lucide-react'
import { ErrorMessage } from './ui/ErrorMessage'
import { ConfirmationModal } from './ui/ConfirmationModal'

interface ShareTripModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  onLeave: () => void
}

export function ShareTripModal({ isOpen, onClose, tripId, onLeave }: ShareTripModalProps) {

  //#region STATES AND EFFECTS

  const [loading, setLoading] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [error, setError] = useState('')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tripOwnerId, setTripOwnerId] = useState<string | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)
  const [actionData, setActionData] = useState<{ type: 'kick' | 'leave', id: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, tripId])

  //#endregion

  //#region FETCH

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .single()

      if (tripErr) throw tripErr
      setTripOwnerId(tripData.user_id)

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

  //#endregion

  //#region ACTIONS

  const addCollaborator = async (userId: string) => {
    try {
      const { error } = await supabase.from('trip_collaborators').insert([{ trip_id: tripId, user_id: userId }])
      if (error) throw error
      fetchData()
    } catch (err: any) { setError(err.message) }
  }

  const handleActionRequest = (type: 'kick' | 'leave', id: string) => {
    setActionData({ type, id })
    setShowConfirm(true)
  }

  const confirmAction = async () => {
    if (!actionData) return

    try {
      const { error } = await supabase.from('trip_collaborators').delete().eq('id', actionData.id)
      if (error) throw error

      if (actionData.type === 'leave') {
        onClose()
        onLeave()
      } else {
        fetchData()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShowConfirm(false)
    }
  }

  if (!isOpen) return null

  const availableFriends = friends.filter(friend =>
    !collaborators.some(c => c.user.id === friend.id) &&
    friend.id !== tripOwnerId
  )

  const isOwner = currentUserId === tripOwnerId;

  //#endregion

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Users className="text-blue-500" /> Condividi Viaggio
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <ErrorMessage message={error} />

        <div style={{ overflowY: 'auto', paddingRight: 5 }}>

          {/* COLLABORATORS */}
          <h4 style={{ color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
            Collaboratori ({collaborators.length})
          </h4>

          {collaborators.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: '0.9rem' }}>Nessun collaboratore.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 25 }}>
              {collaborators.map(c => {
                const isMe = c.user.id === currentUserId;

                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={c.user.avatar_url || 'https://via.placeholder.com/30'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {c.user.full_name} {isMe ? '(Tu)' : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.user.email}</div>
                      </div>
                    </div>

                    {isMe ? (
                      <button
                        onClick={() => handleActionRequest('leave', c.id)}
                        style={{ border: 'none', background: '#FEE2E2', color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, display: 'flex', gap: 5, fontSize: '0.8rem', fontWeight: 'bold' }}
                        title="Abbandona viaggio"
                      >
                        <LogOut size={14} /> Esci
                      </button>
                    ) : isOwner ? (
                      <button
                        onClick={() => handleActionRequest('kick', c.id)}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        title="Rimuovi collaboratore"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null
                    }
                  </div>
                )
              })}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

          {/* OWNER */}
          {isOwner ? (
            <>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
                Invita Amici ({availableFriends.length})
              </h4>

              {loading ? <p>Caricamento...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableFriends.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Tutti i tuoi amici sono già qui o non ne hai ancora.</p>
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
                          <UserPlus size={14} /> Invita
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Solo il proprietario può invitare nuovi collaboratori.
            </p>
          )}

        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmAction}
        title={actionData?.type === 'leave' ? "Abbandona Viaggio" : "Rimuovi Collaboratore"}
        message={actionData?.type === 'leave'
          ? "Sei sicuro di voler uscire da questo viaggio condiviso? Non potrai più vederlo o modificarlo."
          : "Vuoi rimuovere l'accesso a questo utente?"
        }
        confirmText={actionData?.type === 'leave' ? "Sì, Esci" : "Rimuovi"}
        isDangerous={true}
      />

    </div>
  )
}