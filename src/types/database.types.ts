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
      users: {
        Row: {
          id: string
          nickname: string
          role: 'standard' | 'vip' | 'admin'
          gender: 'male' | 'female'
          age: number
          country: string
          avatar: string | null
          created_at: string
          status: 'active' | 'banned' | 'kicked'
          last_seen: string | null
          online: boolean
          vip_expires_at: string | null
        }
        Insert: {
          id: string
          nickname: string
          role?: 'standard' | 'vip' | 'admin'
          gender: 'male' | 'female'
          age: number
          country: string
          avatar?: string | null
          created_at?: string
          status?: 'active' | 'banned' | 'kicked'
          last_seen?: string | null
          online?: boolean
          vip_expires_at?: string | null
        }
        Update: {
          id?: string
          nickname?: string
          role?: 'standard' | 'vip' | 'admin'
          gender?: 'male' | 'female'
          age?: number
          country?: string
          avatar?: string | null
          created_at?: string
          status?: 'active' | 'banned' | 'kicked'
          last_seen?: string | null
          online?: boolean
          vip_expires_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          type: 'text' | 'image' | 'voice'
          status: 'sending' | 'sent' | 'delivered' | 'read'
          read: boolean
          created_at: string
          conversation_id: string
          image_url: string | null
          voice_data: Json | null
          reply_to_id: string | null
          reply_to_message: Json | null
          sender_nickname: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          type?: 'text' | 'image' | 'voice'
          status?: 'sending' | 'sent' | 'delivered' | 'read'
          read?: boolean
          created_at?: string
          conversation_id: string
          image_url?: string | null
          voice_data?: Json | null
          reply_to_id?: string | null
          reply_to_message?: Json | null
          sender_nickname?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          type?: 'text' | 'image' | 'voice'
          status?: 'sending' | 'sent' | 'delivered' | 'read'
          read?: boolean
          created_at?: string
          conversation_id?: string
          image_url?: string | null
          voice_data?: Json | null
          reply_to_id?: string | null
          reply_to_message?: Json | null
          sender_nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          user_nickname: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          user_nickname: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          user_nickname?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          message_id: string | null
          reason: string
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved'
          admin_notes: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          message_id?: string | null
          reason: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          message_id?: string | null
          reason?: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      photo_usage: {
        Row: {
          id: string
          user_id: string
          date: string
          count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      presence: {
        Row: {
          user_id: string
          online: boolean
          last_seen: string
          nickname: string
          gender: 'male' | 'female'
          age: number
          country: string
          role: string
          avatar: string
          joined_at: string
        }
        Insert: {
          user_id: string
          online?: boolean
          last_seen?: string
          nickname: string
          gender: 'male' | 'female'
          age: number
          country: string
          role: string
          avatar: string
          joined_at?: string
        }
        Update: {
          user_id?: string
          online?: boolean
          last_seen?: string
          nickname?: string
          gender?: 'male' | 'female'
          age?: number
          country?: string
          role?: string
          avatar?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}