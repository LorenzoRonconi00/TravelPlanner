import { useDraggable } from '@dnd-kit/core'
import { Sparkles } from 'lucide-react'

interface DraggableAiCardProps {
  suggestion: any
  index: number
}

export function DraggableAiCard({ suggestion, index }: DraggableAiCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ai-${index}`,
    data: { 
      source: 'ai',
      ...suggestion
    }
  })

  const style = {
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    border: isDragging ? '2px dashed var(--primary)' : '1px solid #E7E5E4',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
    backgroundColor: 'white',
    boxShadow: isDragging ? 'none' : '0 2px 5px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
    transform: isDragging ? 'scale(0.95)' : 'scale(1)'
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <h4 style={{margin:'0 0 5px 0', fontSize:'1rem', color: '#431407'}}>{suggestion.title}</h4>
          
          <span style={{
            fontSize:'0.7rem', 
            background:'#FFF7ED', 
            color:'#C2410C', 
            padding:'2px 6px', 
            borderRadius:'4px', 
            border:'1px solid #C2410C', 
            fontWeight:'bold', 
            whiteSpace:'nowrap'
          }}>
              {suggestion.cost || 'Prezzo var.'}
          </span>
      </div>
      
      <p style={{fontSize:'0.85rem', color:'#78716C', margin:'0 0 10px 0'}}>
        {suggestion.description}
      </p>
      
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:'0.8rem', fontWeight:'bold', color:'#431407'}}>
            ⏱ {suggestion.duration} min
          </span>
          <Sparkles size={16} color="#C2410C" />
      </div>
    </div>
  )
}