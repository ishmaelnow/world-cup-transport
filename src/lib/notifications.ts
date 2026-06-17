import { supabase } from './supabase';
import type { Database } from './database.types';

type NotificationType = 'ride_update' | 'payment' | 'verification' | 'system';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  rideId?: string
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      ride_id: rideId,
    });

    if (error) {
      console.error('Failed to create notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

export async function getUnreadNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get unread notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
}

export async function subscribeToNotifications(
  userId: string,
  callback: (notification: Database['public']['Tables']['notifications']['Row']) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Database['public']['Tables']['notifications']['Row']);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
