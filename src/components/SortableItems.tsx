// src/components/SortableItem.tsx
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box } from '@mui/material'

type SortableItemProps = {
  id: string
  children: React.ReactNode
}

export default function SortableItems({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // you can add spacing here or via the child Box
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{ width: '100%' }}  // ensure full width
    >
      {children}
    </Box>
  )
}
