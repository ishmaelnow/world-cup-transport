# In-App Chat System Setup

## Overview
Real-time messaging system for communication between riders, drivers, and admins.

## Features
- **Rider ↔ Driver**: Chat during active rides
- **Admin ↔ Users**: Admins can message any user or broadcast to all
- **Real-time Updates**: Uses Supabase Realtime for instant messaging
- **Read Receipts**: Messages marked as read automatically
- **Ride-based Chat**: Messages linked to specific rides

## Setup Steps

### 1. Run Database Migration
Run the SQL migration in Supabase SQL Editor:
- File: `supabase/migrations/20251224000000_add_chat_system.sql`
- This creates the `messages` table and RLS policies
- Enables Supabase Realtime for the messages table

### 2. Update Database Types (Optional)
The `messages` table type has been added to `database.types.ts`
- If you regenerate types, this will be included automatically

### 3. Deploy Code
The chat components are already integrated:
- `src/components/Chat.tsx` - Main chat component
- Integrated into:
  - `src/pages/rider/ActiveRide.tsx` - Rider can chat with driver
  - `src/pages/driver/ActiveDriverRide.tsx` - Driver can chat with rider
  - `src/pages/admin/AdminDashboard.tsx` - Admin chat tab

## How It Works

### For Riders
- When a ride has an assigned driver, a "Chat with Driver" button appears
- Click to open chat window
- Messages are linked to the ride

### For Drivers
- When a ride has a rider, a "Chat with Rider" button appears
- Click to open chat window
- Messages are linked to the ride

### For Admins
- New "Chat" tab in admin dashboard
- Can chat with users on specific rides
- Can send broadcast messages to all users (`recipient_type = 'all'`)

## Database Schema

```sql
messages (
  id uuid PRIMARY KEY
  ride_id uuid REFERENCES rides(id) -- Optional, for ride-based chat
  sender_id uuid REFERENCES profiles(id) -- Who sent the message
  recipient_id uuid REFERENCES profiles(id) -- Who receives (null for broadcasts)
  recipient_type text -- 'rider', 'driver', 'admin', or 'all'
  message_text text -- The message content
  read boolean -- Read status
  read_at timestamptz -- When read
  created_at timestamptz -- When sent
)
```

## Security (RLS Policies)
- Users can only see messages they sent or received
- Admins can see all messages
- Users can only send messages (not modify others')
- Users can mark their received messages as read

## Real-time Features
- New messages appear instantly via Supabase Realtime
- Messages auto-scroll to bottom
- Read receipts update automatically

