import React from 'react'
import type { PresenceUser } from '../../lib/types'

interface RemoteCursorsProps {
  users: PresenceUser[]
  currentUserId: string
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ users, currentUserId }) => {
  const remoteUsers = users.filter((u) => u.userId !== currentUserId && u.cursor)

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {remoteUsers.map((user) => {
        if (!user.cursor) return null
        return (
          <div
            key={user.userId}
            className="absolute transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
            }}
          >
            {/* SVG Cursor Pointer */}
            <svg
              className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              viewBox="0 0 24 24"
              fill={user.color || '#f5b942'}
              stroke="#0a0b10"
              strokeWidth="1.5"
            >
              <polygon points="0,0 21,9 12,12 9,21" />
            </svg>

            {/* Operative Tag */}
            <div
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold whitespace-nowrap shadow-md ml-3 -mt-2 border border-black/40"
              style={{
                backgroundColor: user.color || '#f5b942',
                color: '#08090d',
              }}
            >
              {user.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
