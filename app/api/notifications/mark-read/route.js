import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { notificationId, userId } = await request.json();

    if (!notificationId || !userId) {
      return Response.json(
        { error: 'Notification ID and User ID required' },
        { status: 400 }
      );
    }

    // Aggiornare notifica come letta
    const { data, error } = await supabaseServer
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId) // Sicurezza: solo proprietario può marcare
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return Response.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }

    // Contare notifiche non lette rimanenti
    const { count: unreadCount } = await supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return Response.json({
      success: true,
      notification: data,
      unreadCount: unreadCount || 0
    });

  } catch (error) {
    console.error('Error in mark-read:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}