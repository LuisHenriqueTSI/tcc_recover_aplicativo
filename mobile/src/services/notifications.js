import supabase from '../lib/supabase';

// Busca notificações do usuário logado
export async function getUserNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[notifications] Erro ao buscar notificações:', error);
    return [];
  }
  return data;
}

// Marca todas como lidas
export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) {
    console.error('[notifications] Erro ao marcar notificações como lidas:', error);
  }
}

// Marca uma notificação como lida
export async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) {
    console.error('[notifications] Erro ao marcar notificação como lida:', error);
  }
}
