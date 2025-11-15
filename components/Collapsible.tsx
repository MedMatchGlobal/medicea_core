'use client'

import { useState } from 'react'

interface CollapsibleProps {
  title: string
  children: React.ReactNode
}

export default function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#f0f0f0',
          padding: '0.5rem 1rem',
          border: '1px solid #ccc',
          cursor: 'pointer',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}
