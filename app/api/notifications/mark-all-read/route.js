import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Marcare tutte le notifiche non lette come lette
    const { data, error } = await supabaseServer
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return Response.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      markedCount: data?.length || 0,
      unreadCount: 0
    });

  } catch (error) {
    console.error('Error in mark-all-read:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}