import { supabase } from '../lib/supabase';
import { uploadMessagePhoto as uploadMessagePhotoFS } from './uploadMessagePhoto';

export const sendMessage = async (messageData) => {
  try {
    console.log('[sendMessage] Enviando mensagem...');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: messageData.sender_id,
        receiver_id: messageData.receiver_id,
        item_id: messageData.item_id,
        content: messageData.content,
        photo_url: messageData.photo_url,
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

export const getConversations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) {
      console.log('[getConversations] Erro:', error.message);
      return [];
    }

    // Group by conversation (sender/receiver pair)
    const conversations = new Map();
    
    if (data) {
      data.forEach(msg => {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const key = [userId, otherId].sort().join('_');
        
        if (!conversations.has(key)) {
          conversations.set(key, {
            otherId,
            lastMessage: msg.content,
            lastMessageAt: msg.sent_at,
            unread: msg.receiver_id === userId && !msg.read,
          });
        }
      });
    }

    return Array.from(conversations.values());
  } catch (error) {
    console.log('[getConversations] Exceção:', error.message);
    return [];
  }
};

export const getMessages = async (userId, otherUserId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
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
