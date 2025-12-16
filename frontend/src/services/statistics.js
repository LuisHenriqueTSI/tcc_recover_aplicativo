import { supabase } from '../supabaseClient';

// Serviço para buscar estatísticas de itens resolvidos
export async function getResolvedStatistics() {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('category')
      .eq('resolved', true);
    
    if (error) throw error;
    
    // Contar por categoria
    const categoryCount = {};
    items.forEach(item => {
      const cat = item.category || 'Outros';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    const by_category = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    const result = {
      total_resolved: items.length,
      by_category
    };
    
    return { data: result, error: null };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return { data: null, error };
  }
}

export async function markItemAsResolved(itemId) {
  try {
    const { data, error } = await supabase
      .from('items')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select();
    
    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error marking item as resolved:', error);
    return { data: null, error };
  }
}

export async function getPendingNotificationItems() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.debug('[getPendingNotificationItems] Usuário não autenticado');
      return { data: [], error: null };
    }
    
    // Buscar itens criados há mais de 1 minuto e não resolvidos
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', user.id)
      .eq('resolved', false)
      .lt('created_at', oneMinuteAgo);
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching pending items:', error);
    return { data: [], error };
  }
}
