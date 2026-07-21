import { getRenewalInfo } from './itemExpiration.js';
import { shouldIgnoreNotificationError } from './notificationErrors.js';

let supabaseClient = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  try {
    const mod = await import('../lib/supabase.js');
    supabaseClient = mod.supabase;
  } catch (error) {
    supabaseClient = null;
  }
  return supabaseClient;
}

function buildSystemNotificationPayload({ userId, type, title, message, itemId }) {
  return {
    user_id: userId,
    title,
    message,
    type,
    read: false,
    item_id: itemId || null,
    created_at: new Date().toISOString(),
  };
}

// Busca notificações do usuário logado
export async function getUserNotifications(userId) {
  if (!userId) return [];
  const supabase = await getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Erro ao buscar notificações:', error);
    }
    return [];
  }
  return data;
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const supabase = await getSupabaseClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Erro ao contar notificações não lidas:', error);
    }
    return 0;
  }

  return count || 0;
}

// Marca todas como lidas
export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error && !shouldIgnoreNotificationError(error)) {
    console.error('[notifications] Erro ao marcar notificações como lidas:', error);
  }
}

// Marca uma notificação como lida
export async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error && !shouldIgnoreNotificationError(error)) {
    console.error('[notifications] Erro ao marcar notificação como lida:', error);
  }
}

export async function createRenewalReminderNotification(item, userId) {
  if (!item || !userId) return null;

  const renewalInfo = getRenewalInfo(item);
  if (!renewalInfo.canRenew || (!renewalInfo.needsRenewal && !renewalInfo.willBePermanentlyDeletedSoon)) return null;

  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const existing = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'renewal_reminder')
    .eq('item_id', item.id)
    .limit(1);

  if (!existing.error && existing.data && existing.data.length > 0) {
    return existing.data[0];
  }

  const title = renewalInfo.willBePermanentlyDeletedSoon
    ? `URGENTE: seu anúncio será excluído permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}`
    : renewalInfo.daysRemaining <= 3
      ? 'URGENTE: renove seu anúncio'
      : 'Atenção: renove seu anúncio';

  const message = renewalInfo.willBePermanentlyDeletedSoon
    ? `Seu anúncio "${item.title || 'sem título'}" será excluído permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}. Renove agora para evitar a perda definitiva.`
    : renewalInfo.daysRemaining <= 3
      ? `Seu anúncio "${item.title || 'sem título'}" expira em ${renewalInfo.daysRemaining} dia${renewalInfo.daysRemaining === 1 ? '' : 's'}. Renovar agora é essencial para manter sua publicação visível.`
      : `Seu anúncio "${item.title || 'sem título'}" expira em ${renewalInfo.daysRemaining} dia${renewalInfo.daysRemaining === 1 ? '' : 's'}. Renove para mantê-lo no topo.`;

  const { data, error } = await supabase
    .from('notifications')
    .insert(buildSystemNotificationPayload({
      userId,
      type: 'renewal_reminder',
      title,
      message,
      itemId: item.id,
    }))
    .select()
    .single();

  if (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Erro ao criar notificação de renovação:', error);
    }
    return null;
  }

  return data;
}

export async function createItemRemovedNotification(item, userId) {
  if (!item || !userId) return null;

  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('notifications')
    .insert(buildSystemNotificationPayload({
      userId,
      type: 'item_removed',
      title: 'Sua publicação foi removida',
      message: `Sua publicação "${item.title || 'sem título'}" expirou e foi removida automaticamente do sistema para manter o feed organizado.`,
      itemId: item.id,
    }))
    .select()
    .single();

  if (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Erro ao criar notificação de remoção:', error);
    }
    return null;
  }

  return data;
}

export function buildRenewalAlerts(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .filter(Boolean)
    .map(item => {
      const renewalInfo = getRenewalInfo(item);
      if (!renewalInfo.canRenew) {
        return null;
      }

      const shouldAlert = renewalInfo.willBePermanentlyDeletedSoon || renewalInfo.inactive || renewalInfo.needsRenewal || renewalInfo.expired;
      if (!shouldAlert) {
        return null;
      }

      const title = renewalInfo.willBePermanentlyDeletedSoon
        ? 'Atenção: remoção permanente'
        : renewalInfo.expired
          ? 'Anúncio vencido'
          : 'Renove seu anúncio';

      const message = renewalInfo.willBePermanentlyDeletedSoon
        ? `Seu anúncio "${item.title || 'sem título'}" será excluído permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}. Renove agora para evitar perda definitiva.`
        : renewalInfo.expired
          ? `Seu anúncio "${item.title || 'sem título'}" já venceu. Renove para mantê-lo visível novamente.`
          : `Seu anúncio "${item.title || 'sem título'}" está próximo do vencimento. Renove para mantê-lo visível.`;

      return {
        id: `renewal_${item.id}`,
        type: 'renewal_reminder',
        title,
        message,
        time: '',
        read: false,
        icon: 'alert-triangle',
        iconColor: '#F59E42',
        bgColor: '#FFF7ED',
        critical: true,
        itemId: item.id,
      };
    })
    .filter(Boolean);
}

export async function syncRenewalNotifications(userId, items = []) {
  if (!userId || !Array.isArray(items)) return [];

  const created = [];
  for (const item of items) {
    if (!item || item.owner_id !== userId) continue;
    const renewalInfo = getRenewalInfo(item);
    if (renewalInfo.canRenew && (renewalInfo.needsRenewal || renewalInfo.willBePermanentlyDeletedSoon)) {
      const result = await createRenewalReminderNotification(item, userId);
      if (result) created.push(result);
    }
  }
  return created;
}
