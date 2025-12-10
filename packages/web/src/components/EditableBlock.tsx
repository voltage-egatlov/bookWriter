import { useState } from 'react'
import { Block } from '@/lib/types'
import { EditorOverlay } from './EditorOverlay'

interface EditableBlockProps {
  block: Block
  chapterId: string
  isEditable: boolean
  onEdit: (chapterId: string, blockId: string, newContent: string) => Promise<void>
  className?: string
  style?: React.CSSProperties
}

export function EditableBlock({
  block,
  chapterId,
  isEditable,
  onEdit,
  className,
  style,
}: EditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (isEditable) {
      setIsEditing(true)
    }
  }

  const handleSave = async (newContent: string) => {
    await onEdit(chapterId, block.id, newContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const blockStyle: React.CSSProperties = {
    ...style,
    cursor: isEditable ? 'pointer' : 'default',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    backgroundColor: isHovered && isEditable ? 'rgba(0, 123, 255, 0.05)' : 'transparent',
    border: isHovered && isEditable ? '1px dashed rgba(0, 123, 255, 0.3)' : '1px solid transparent',
  }

  return (
    <>
      <div
        className={className}
        style={blockStyle}
        onClick={handleClick}
        onMouseEnter={() => isEditable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isEditable ? 'Click to edit' : undefined}
      >
        {block.content}
      </div>

      {isEditing && (
        <EditorOverlay
          initialContent={block.content}
          onSave={handleSave}
          onCancel={handleCancel}
          title={`Edit Block (Page ${block.order + 1})`}
        />
      )}
    </>
  )
}
