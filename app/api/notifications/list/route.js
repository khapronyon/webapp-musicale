import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { userId, limit = 50, offset = 0, unreadOnly = false } = await request.json();

    if (!userId) {
      return Response.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Query base
    let query = supabaseServer
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrare solo non lette se richiesto
    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return Response.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Contare notifiche non lette
    const { count: unreadCount } = await supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return Response.json({
      notifications: data || [],
      unreadCount: unreadCount || 0,
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Error in notifications list:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}