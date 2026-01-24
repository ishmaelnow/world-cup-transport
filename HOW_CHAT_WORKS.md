# How the In-App Chat System Works

## 📍 Migration File Location

**File Path:** `supabase/migrations/20251224000000_add_chat_system.sql`

**To Run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of the file
3. Paste and run it

---

## 🏗️ Architecture Overview

### Database Layer
- **`messages` table**: Stores all chat messages
- **RLS Policies**: Control who can see/send messages
- **Realtime**: Supabase automatically pushes new messages to connected clients

### Frontend Layer
- **`Chat.tsx` component**: Reusable chat UI component
- **Real-time subscriptions**: Listens for new messages via Supabase Realtime
- **Auto-scroll**: Messages automatically scroll to bottom
- **Read receipts**: Messages marked as read when viewed

---

## 🔄 How Messages Flow

### Scenario 1: Rider ↔ Driver (During Active Ride)

```
1. Rider creates ride → Status: 'matching'
2. Driver accepts ride → Status: 'accepted', driver_id assigned
3. Both see "Chat" button appear
4. Rider clicks "Show Chat"
   └─> Opens Chat component with rideId={ride.id}
   └─> Loads all messages WHERE ride_id = ride.id
   └─> Subscribes to realtime INSERT events for this ride_id
5. Rider types message and sends
   └─> INSERT into messages table:
       - ride_id: ride.id
       - sender_id: rider.id
       - recipient_id: driver.user_id
       - message_text: "Hello driver!"
6. Supabase Realtime detects INSERT
   └─> Pushes to all subscribed clients (rider + driver)
7. Driver's Chat component receives new message
   └─> Adds to messages array
   └─> Auto-scrolls to show new message
   └─> Marks as read automatically
```

### Scenario 2: Admin ↔ User (Direct Message)

```
1. Admin opens Chat tab
2. Admin selects a user or ride
3. Admin types message
   └─> INSERT into messages:
       - sender_id: admin.id
       - recipient_id: user.id (or null for broadcast)
       - recipient_type: 'admin' (or 'all' for broadcast)
4. User receives message in real-time
5. User can reply (creates new message with sender_id = user.id)
```

---

## 🔐 Security & Permissions

### RLS Policies Explained

**1. "Users can view their messages"**
- You can see messages you sent OR received
- OR broadcast messages (recipient_type = 'all')

**2. "Users can send messages"**
- You can only send messages where sender_id = your user ID
- Prevents impersonation

**3. "Users can update received messages"**
- You can only mark YOUR received messages as read
- Can't modify message content

**4. "Admins can view all messages"**
- Admins see everything (for support purposes)

---

## 📡 Real-time Updates

### How Supabase Realtime Works

```typescript
// Component subscribes to changes
const channel = supabase
  .channel(`chat:${rideId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    table: 'messages',
    filter: `ride_id=eq.${rideId}`
  }, (payload) => {
    // New message received!
    setMessages([...messages, payload.new]);
  })
  .subscribe();
```

**What happens:**
1. Component creates a subscription channel
2. Supabase listens to database changes
3. When a new message is INSERTed, Supabase pushes it to all subscribed clients
4. Component receives the update and adds it to the UI
5. Message appears instantly (no page refresh needed)

---

## 💬 Message Types

### 1. Ride-Based Messages
- **Linked to a specific ride** (`ride_id` is set)
- Used for: Rider ↔ Driver communication during a trip
- Both parties see the same conversation
- Messages persist even after ride completes

### 2. Direct Messages
- **Between two users** (`recipient_id` is set)
- Used for: Admin ↔ User support, or general communication
- One-on-one conversation
- Not tied to a specific ride

### 3. Broadcast Messages
- **To all users** (`recipient_type = 'all'`)
- Used for: Admin announcements, system messages
- Everyone sees the message
- Useful for platform-wide notifications

---

## 🎨 UI Flow

### For Riders:
```
Active Ride Page
  └─> Driver assigned?
      └─> Shows "Chat with Driver" button
          └─> Click → Opens Chat component
              └─> Shows all messages for this ride
              └─> Can type and send messages
              └─> Messages appear instantly
```

### For Drivers:
```
Active Ride Page
  └─> Rider assigned?
      └─> Shows "Chat with Rider" button
          └─> Click → Opens Chat component
              └─> Same as rider flow
```

### For Admins:
```
Admin Dashboard
  └─> Click "Chat" tab
      └─> See list of active rides
          └─> Click on a ride → Opens chat for that ride
      └─> OR use "General Support" for broadcasts
```

---

## 🔧 Technical Details

### Message Loading
```typescript
// Loads messages based on context:
if (rideId) {
  // Get all messages for this ride
  query = query.eq('ride_id', rideId);
} else if (recipientId) {
  // Get messages between two users
  query = query.or(
    `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),
     and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
  );
}
```

### Read Receipts
```typescript
// When message is viewed:
markAsRead([messageId]);

// Updates database:
UPDATE messages 
SET read = true, read_at = now() 
WHERE id = messageId;
```

### Auto-Scroll
```typescript
// Scrolls to bottom when new messages arrive
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

---

## 🚀 Benefits

1. **Real-time**: No page refresh needed
2. **Secure**: RLS ensures users only see their messages
3. **Scalable**: Supabase handles real-time infrastructure
4. **Persistent**: Messages stored in database (history preserved)
5. **Flexible**: Works for rides, direct messages, and broadcasts

---

## 📝 Next Steps

1. **Run the migration** (`20251224000000_add_chat_system.sql`)
2. **Test it**: Create a ride, assign driver, open chat
3. **Verify**: Messages should appear instantly for both parties

The system is ready to use once the migration is run!

