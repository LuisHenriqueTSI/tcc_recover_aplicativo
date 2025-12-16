import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Verifica a cada 10 segundos
    const interval = setInterval(fetchUnreadCount, 10000);
    
    // Escutar evento customizado de mensagens lidas
    const handleMessagesRead = () => {
      console.log('[useUnreadMessages] Messages read event received, refreshing count');
      fetchUnreadCount();
    };
    
    // Escutar evento de nova mensagem
    const handleNewMessage = () => {
      console.log('[useUnreadMessages] New message event received, refreshing count');
      fetchUnreadCount();
    };
    
    window.addEventListener('messages-read', handleMessagesRead);
    window.addEventListener('new-message', handleNewMessage);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messages-read', handleMessagesRead);
      window.removeEventListener('new-message', handleNewMessage);
    };
  }, []);

  async function fetchUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUnreadCount(0);
        return;
      }

      const { data, count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (!error) {
        const unreadCount = count || 0;
        console.log('[useUnreadMessages] Unread count:', unreadCount);
        setUnreadCount(unreadCount);
      } else {
        console.error('[useUnreadMessages] Error:', error);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[useUnreadMessages] Error fetching unread count:', error);
      setUnreadCount(0);
    }
  }

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
}
