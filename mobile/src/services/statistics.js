import { supabase } from '../lib/supabase';

export const getStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('statistics')
      .select('*')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log('[getStatistics] Erro:', error.message);
    }

    // If no statistics exist or error, compute them
    if (!data || error) {
      return await computeStatistics();
    }

    return data;
  } catch (error) {
    console.log('[getStatistics] Exceção:', error.message);
    return await computeStatistics();
  }
};

export const computeStatistics = async () => {
  try {
    console.log('[computeStatistics] Calculando estatísticas...');

    // Count items
    const { count: totalItems } = await supabase
      .from('items')
      .select('id', { count: 'exact' });

    const { count: itemsFound } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('status', 'found');

    const { count: itemsLost } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('status', 'lost');

    const { count: itemsResolved } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('resolved', true);

    // Count users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    // Count messages
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact' });

    const stats = {
      total_items: totalItems || 0,
      items_found: itemsFound || 0,
      items_lost: itemsLost || 0,
      items_resolved: itemsResolved || 0,
      total_users: totalUsers || 0,
      total_messages: totalMessages || 0,
      last_updated: new Date().toISOString(),
    };

    console.log('[computeStatistics] Estatísticas calculadas:', stats);
    return stats;
  } catch (error) {
    console.log('[computeStatistics] Exceção:', error.message);
    return {
      total_items: 0,
      items_found: 0,
      items_lost: 0,
      items_resolved: 0,
      total_users: 0,
      total_messages: 0,
    };
  }
};
