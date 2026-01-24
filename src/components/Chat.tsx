import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { Send, X } from 'lucide-react';
import type { Database } from '../lib/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Message = Database['public']['Tables']['messages']['Row'];

interface ChatProps {
  rideId?: string;
  recipientId?: string;
  recipientType?: 'rider' | 'driver' | 'admin';
  onClose?: () => void;
  title?: string;
}

export function Chat({ rideId, recipientId, recipientType, onClose, title }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;
    
    loadMessages();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [rideId, recipientId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (rideId) {
      query = query.eq('ride_id', rideId);
    } else if (recipientId) {
      // Get messages between current user and recipient
      query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`);
    } else if (recipientType === 'all') {
      // Admin broadcast messages
      query = query.eq('recipient_type', 'all');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
      // Mark messages as read
      markAsRead(data?.filter(m => m.recipient_id === user.id && !m.read).map(m => m.id) || []);
    }

    setLoading(false);
  };

  const subscribeToMessages = () => {
    if (!user) return;

    const channel = supabase
      .channel(`chat:${rideId || recipientId || 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: rideId 
            ? `ride_id=eq.${rideId}` 
            : recipientId 
            ? `or(and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id}))`
            : recipientType === 'all'
            ? `recipient_type=eq.all`
            : undefined,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if it's relevant to this chat
          if (
            (rideId && newMessage.ride_id === rideId) ||
            (recipientId && (newMessage.sender_id === recipientId || newMessage.recipient_id === recipientId)) ||
            (recipientType === 'all' && newMessage.recipient_type === 'all')
          ) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            // Mark as read if we're the recipient
            if (newMessage.recipient_id === user.id || (newMessage.recipient_type === 'all' && newMessage.sender_id !== user.id)) {
              markAsRead([newMessage.id]);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const markAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', messageIds);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        ride_id: rideId || null,
        sender_id: user.id,
        recipient_id: recipientId || null,
        recipient_type: recipientType || null,
        message_text: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          {title || 'Chat'}
        </h3>
        {onClose && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message_text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}

