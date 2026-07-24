import { getRenewalInfo } from './itemExpiration.js';
import { shouldIgnoreNotificationError } from './notificationErrors.js';
import { dispatchSystemNotificationToWhatsApp } from './whatsappNotifications.js';

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
  try {
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

    return data || [];
  } catch (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Exceção ao buscar notificações:', error);
    }
    return [];
  }
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const supabase = await getSupabaseClient();
  if (!supabase) return 0;

  try {
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
  } catch (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Exceção ao contar notificações não lidas:', error);
    }
    return 0;
  }
}

// Marca todas como lidas
export async function markAllNotificationsRead(userId) {
  if (!userId) return false;
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      if (shouldIgnoreNotificationError(error)) {
        return true;
      }
      console.error('[notifications] Erro ao marcar notificações como lidas:', error);
      return false;
    }

    return true;
  } catch (error) {
    if (shouldIgnoreNotificationError(error)) {
      return true;
    }
    console.error('[notifications] Exceção ao marcar notificações como lidas:', error);
    return false;
  }
}

// Marca uma notificação como lida
export async function markNotificationRead(notificationId) {
  if (!notificationId) return false;
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      if (shouldIgnoreNotificationError(error)) {
        return true;
      }
      console.error('[notifications] Erro ao marcar notificação como lida:', error);
      return false;
    }

    return true;
  } catch (error) {
    if (shouldIgnoreNotificationError(error)) {
      return true;
    }
    console.error('[notifications] Exceção ao marcar notificação como lida:', error);
    return false;
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
    ? `URGENTE: sua publicação será excluída permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}`
    : renewalInfo.daysRemaining <= 3
      ? 'URGENTE: renove sua publicação'
      : 'Atenção: renove sua publicação';

  const message = renewalInfo.willBePermanentlyDeletedSoon
    ? `Sua publicação "${item.title || 'sem título'}" será excluída permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}. Renove agora para evitar a perda definitiva.`
    : renewalInfo.daysRemaining <= 3
      ? `Sua publicação "${item.title || 'sem título'}" expira em ${renewalInfo.daysRemaining} dia${renewalInfo.daysRemaining === 1 ? '' : 's'}. Renovar agora é essencial para manter sua publicação visível.`
      : `Sua publicação "${item.title || 'sem título'}" expira em ${renewalInfo.daysRemaining} dia${renewalInfo.daysRemaining === 1 ? '' : 's'}. Renove para mantê-la no topo.`;

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

  try {
    await dispatchSystemNotificationToWhatsApp({
      userId,
      title: 'Sua publicação foi removida',
      message: `Sua publicação "${item.title || 'sem título'}" expirou e foi removida automaticamente do sistema para manter o feed organizado.`,
      type: 'item_removed',
    });
  } catch (whatsappError) {
    console.warn('[notifications] Falha ao enviar remoção para WhatsApp:', whatsappError);
  }

  return data;
}

export async function createMatchNotification({ userId, itemId, matchedItemId, score, matchedItemTitle, message }) {
  if (!userId || !itemId || !matchedItemId) return null;

  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('notifications')
    .insert(buildSystemNotificationPayload({
      userId,
      type: 'match',
      title: 'Possível correspondência',
      message: message || `Um item encontrado pode corresponder ao que você perdeu (${score || 0}% de similaridade).`,
      itemId,
    }))
    .select()
    .single();

  if (error) {
    if (!shouldIgnoreNotificationError(error)) {
      console.error('[notifications] Erro ao criar notificação de match:', error);
    }
    return null;
  }

  try {
    await dispatchSystemNotificationToWhatsApp({
      userId,
      title: 'Possível correspondência',
      message: message || `Um item encontrado pode corresponder ao que você perdeu (${score || 0}% de similaridade).`,
      type: 'match',
    });
  } catch (whatsappError) {
    console.warn('[notifications] Falha ao enviar match para WhatsApp:', whatsappError);
  }

  return data;
}

export async function createNotification({ user_id, type, title, message, item_id = null }) {
  console.log('[notifications.createNotification] Criando notificação genérica');
  console.log('[notifications.createNotification] user_id:', user_id);
  console.log('[notifications.createNotification] type:', type);
  console.log('[notifications.createNotification] title:', title);
  console.log('[notifications.createNotification] message:', message);
  console.log('[notifications.createNotification] item_id:', item_id);

  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.error('[notifications.createNotification] Supabase não disponível');
    return null;
  }

  const payload = buildSystemNotificationPayload({
    userId: user_id,
    type,
    title,
    message,
    itemId: item_id,
  });

  // Claim notifications are optional for now. The claim workflow should not fail if
  // the Supabase notifications table is still protected by RLS.
  if (type === 'claim') {
    console.log('[notifications.createNotification] Pulando criação de notificação de claim por enquanto');
    return null;
  }

  console.log('[notifications.createNotification] Payload a inserir:', payload);

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[notifications.createNotification] Erro ao inserir:', error);
      if (!shouldIgnoreNotificationError(error)) {
        throw error;
      }
      return null;
    }

    console.log('[notifications.createNotification] ✓ Notificação criada com sucesso:', data.id);

    try {
      await dispatchSystemNotificationToWhatsApp({
        userId: user_id,
        title,
        message,
        type,
      });
    } catch (whatsappError) {
      console.warn('[notifications.createNotification] Falha ao enviar para WhatsApp:', whatsappError);
    }

    return data;
  } catch (err) {
    console.error('[notifications.createNotification] Exceção:', err);
    throw err;
  }
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
          ? 'Publicação vencida'
          : 'Renove sua publicação';

      const message = renewalInfo.willBePermanentlyDeletedSoon
        ? `Sua publicação "${item.title || 'sem título'}" será excluída permanentemente em ${renewalInfo.deleteDaysRemaining} dia${renewalInfo.deleteDaysRemaining === 1 ? '' : 's'}. Renove agora para evitar perda definitiva.`
        : renewalInfo.expired
          ? `Sua publicação "${item.title || 'sem título'}" já venceu. Renove para mantê-la visível novamente.`
          : `Sua publicação "${item.title || 'sem título'}" está próxima do vencimento. Renove para mantê-la visível.`;

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
