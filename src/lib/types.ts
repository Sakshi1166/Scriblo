export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          canvas_state: Json
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          passcode: string | null
          title: string
        }
        Insert: {
          canvas_state?: Json
          created_at?: string
          created_by?: string | null
          expires_at: string
          id: string
          passcode?: string | null
          title?: string
        }
        Update: {
          canvas_state?: Json
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          passcode?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      purge_expired_rooms: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export interface PresenceUser {
  userId: string
  name: string
  color: string
  joinedAt: number
  cursor?: {
    x: number
    y: number
  }
}

export interface BroadcastStrokeEvent {
  type: 'stroke_update'
  userId: string
  changes: Record<string, unknown>
}

export interface BroadcastBurnEvent {
  type: 'room_burn'
  burnedBy: string
  timestamp: string
}

export type RoomBroadcastEvent = BroadcastStrokeEvent | BroadcastBurnEvent

export type TtlOption = {
  label: string
  minutes: number
  description: string
}

export const TTL_OPTIONS: TtlOption[] = [
  { label: '15 Minutes', minutes: 15, description: 'Quick tactical drop' },
  { label: '1 Hour', minutes: 60, description: 'Standard debrief' },
  { label: '6 Hours', minutes: 360, description: 'Extended operation' },
  { label: '24 Hours', minutes: 1440, description: 'Maximum window' },
]

export const NEON_COLORS = [
  '#00F0FF', // Cyber Cyan
  '#00FF9D', // Acid Emerald
  '#FF2A5F', // Crimson Laser
  '#FFB800', // Amber Pulse
  '#BD00FF', // Neon Purple
  '#FF7700', // Solar Flare
  '#39FF14', // Matrix Green
]
