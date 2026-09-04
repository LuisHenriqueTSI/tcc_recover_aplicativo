import { supabase } from '../lib/supabase';
import { uploadMessagePhoto as uploadMessagePhotoFS } from './uploadMessagePhoto';
import { getUserById } from './user';
import AsyncStorage from '@react-native-async-storage/async-storage';

const hiddenConversationsKey = (userId) => `hidden_conversations_${userId}`;

const conversationKey = (userId, otherUserId) => [userId, otherUserId].sort().join('_');

const getHiddenConversationKeys = async (userId) => {
  try {
    const raw = await AsyncStorage.getItem(hiddenConversationsKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log('[messages] Erro ao carregar conversas ocultas:', error.message);
    return [];
  }
};

const saveHiddenConversationKeys = async (userId, keys) => {
  await AsyncStorage.setItem(hiddenConversationsKey(userId), JSON.stringify(keys));
};

export const hideConversation = async (userId, otherUserId) => {
  if (!userId || !otherUserId) throw new Error('Conversa inválida.');
  const keys = await getHiddenConversationKeys(userId);
  const key = conversationKey(userId, otherUserId);
  if (!keys.includes(key)) await saveHiddenConversationKeys(userId, [...keys, key]);
};

const showConversationAgain = async (userId, otherUserId) => {
  const key = conversationKey(userId, otherUserId);
  const keys = await getHiddenConversationKeys(userId);
  const nextKeys = keys.filter((hiddenKey) => hiddenKey !== key);
  if (nextKeys.length !== keys.length) await saveHiddenConversationKeys(userId, nextKeys);
};

const getNextMessageId = async () => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    const lastId = Array.isArray(data) && data.length > 0 ? Number(data[0].id) : 0;
    return Number.isFinite(lastId) ? lastId + 1 : 1;
  } catch (error) {
    console.log('[getNextMessageId] Erro:', error.message);
    return Date.now();
  }
};

export const sendMessage = async (messageData) => {
  try {
    console.log('[sendMessage] Enviando mensagem...');
    const conversation = await getOrCreateConversation(
      messageData.sender_id,
      messageData.receiver_id,
      messageData.item_id
    );
    if (conversation.status === 'encerrada') {
      throw new Error('Esta conversa foi encerrada e não aceita novas mensagens.');
    }
    await showConversationAgain(messageData.sender_id, messageData.receiver_id);

    const nextMessageId = await getNextMessageId();
    const sentAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: nextMessageId,
        sender_id: messageData.sender_id,
        receiver_id: messageData.receiver_id,
        item_id: messageData.item_id,
        content: messageData.content,
        photo_url: messageData.photo_url,
        conversation_id: conversation.id,
        sent_at: sentAt,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.log('[sendMessage] Erro:', error.message);
      throw error;
    }

    console.log('[sendMessage] Mensagem enviada com sucesso');
    return data;
  } catch (error) {
    console.log('[sendMessage] Exceção:', error.message);
    throw error;
  }
};

export const getOrCreateConversation = async (userId, otherUserId, itemId = null) => {
  if (!userId || !otherUserId) throw new Error('Participantes inválidos.');
  const participantA = userId < otherUserId ? userId : otherUserId;
  const participantB = userId < otherUserId ? otherUserId : userId;
  const query = supabase
    .from('conversations')
    .select('id, status')
    .eq('participant_a', participantA)
    .eq('participant_b', participantB);
  const { data: existing, error: findError } = itemId
    ? await query.eq('item_id', itemId).maybeSingle()
    : await query.is('item_id', null).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_a: participantA,
      participant_b: participantB,
      item_id: itemId,
      status: 'ativa',
    })
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
};

export const closeConversation = async (conversationId) => {
  if (!conversationId) throw new Error('Conversa inválida.');
  const { data, error } = await supabase
    .from('conversations')
    .update({ status: 'encerrada', closed_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('status', 'ativa')
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
};

export const getCachedConversations = async (userId) => {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(`@wefind_conversations_cache_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const getConversations = async (userId) => {
  try {
    // 1. Busca as mensagens mais recentes do usuário
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('sent_at', { ascending: false })
      .limit(120);

    if (error) {
      console.log('[getConversations] Erro:', error.message);
      return await getCachedConversations(userId);
    }

    if (!messages || messages.length === 0) return [];

    const hiddenKeys = await getHiddenConversationKeys(userId);

    // 2. Agrupa conversas únicas e coleta IDs para busca em lote (BATCH)
    const rawConvs = new Map();
    const otherUserIds = new Set();
    const itemIds = new Set();

    for (const msg of messages) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!otherId) continue;
      const key = [userId, otherId].sort().join('_');
      if (hiddenKeys.includes(key)) continue;

      if (!rawConvs.has(key)) {
        rawConvs.set(key, { otherId, msg });
        otherUserIds.add(otherId);
        if (msg.item_id) itemIds.add(msg.item_id);
      }
    }

    // 3. Executa queries em LOTE e em PARALELO (apenas 2 queries ultra-rápidas)
    const [profilesRes, itemsRes] = await Promise.all([
      otherUserIds.size > 0
        ? supabase.from('profiles').select('id, name, avatar_url').in('id', Array.from(otherUserIds))
        : Promise.resolve({ data: [] }),
      itemIds.size > 0
        ? supabase.from('items').select('id, title, species, status').in('id', Array.from(itemIds))
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map();
    (profilesRes?.data || []).forEach(p => profileMap.set(p.id, p));

    const itemMap = new Map();
    (itemsRes?.data || []).forEach(i => itemMap.set(i.id, i));

    // 4. Monta o resultado final instantaneamente
    const result = [];
    for (const [key, { otherId, msg }] of rawConvs.entries()) {
      const prof = profileMap.get(otherId);
      const itemInfo = msg.item_id ? itemMap.get(msg.item_id) : null;
      const isItemDeleted = Boolean(msg.item_id && !itemInfo);
      const itemTitle = itemInfo?.title || itemInfo?.species || (isItemDeleted ? 'Publicação excluída' : '');

      result.push({
        otherId,
        otherName: prof?.name || 'Membro WeFIND',
        avatarUrl: prof?.avatar_url || null,
        lastMessage: msg.content,
        lastPhotoUrl: msg.photo_url || null,
        lastMessageAt: msg.sent_at,
        unread: msg.receiver_id === userId && !msg.read,
        itemId: msg.item_id,
        itemTitle,
        itemStatus: itemInfo?.status || (isItemDeleted ? 'deleted' : null),
        isItemDeleted,
        status: 'ativa',
      });
    }

    // Atualiza o cache local silenciosamente para abertura em 0ms
    AsyncStorage.setItem(`@wefind_conversations_cache_${userId}`, JSON.stringify(result)).catch(() => {});

    return result;
  } catch (error) {
    console.log('[getConversations] Exceção:', error.message);
    return await getCachedConversations(userId);
  }
};

export const getMessages = async (userId, otherUserId, options = 50) => {
  try {
    let limit = 50;
    let itemId = null;

    if (typeof options === 'number') {
      limit = options;
    } else if (typeof options === 'object' && options !== null) {
      limit = options.limit || 50;
      itemId = options.itemId || null;
    } else if (typeof options === 'string' && options.length > 5 && isNaN(Number(options))) {
      itemId = options;
    }

    let query = supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('[getMessages] Erro:', error.message);
      return [];
    }

    return (data || []).reverse();
  } catch (error) {
    console.log('[getMessages] Exceção:', error.message);
    return [];
  }
};

export const markMessagesAsRead = async (userId, otherUserId) => {
  try {
    console.log('[markMessagesAsRead] Marcando mensagens como lidas...');

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', otherUserId);

    if (error) {
      console.log('[markMessagesAsRead] Erro:', error.message);
      throw error;
    }

    console.log('[markMessagesAsRead] Mensagens marcadas como lidas');
    return { success: true };
  } catch (error) {
    console.log('[markMessagesAsRead] Exceção:', error.message);
    throw error;
  }
};

export const markAllMessagesAsRead = async (userId) => {
  try {
    console.log('[markAllMessagesAsRead] Marcando todas mensagens como lidas...');

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.log('[markAllMessagesAsRead] Erro:', error.message);
      throw error;
    }

    console.log('[markAllMessagesAsRead] Todas as mensagens foram marcadas como lidas');
    return { success: true };
  } catch (error) {
    console.log('[markAllMessagesAsRead] Exceção:', error.message);
    throw error;
  }
};

export const getUnreadCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.log('[getUnreadCount] Erro:', error.message);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.log('[getUnreadCount] Exceção:', error.message);
    return 0;
  }
};

// Usa a versão confiável baseada em expo-file-system
export const uploadMessagePhoto = uploadMessagePhotoFS;
