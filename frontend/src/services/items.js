import { supabase } from '../supabaseClient';

// Serviço para registro de itens
export async function registerItem(item) {
  // Obter usuário autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }
  
  // Adicionar owner_id do usuário autenticado
  const itemWithOwner = {
    ...item,
    owner_id: user.id
  };
  
  console.log('[registerItem] Criando item:', itemWithOwner);
  
  const { data, error } = await supabase
    .from('items')
    .insert([itemWithOwner])
    .select();
  
  if (error) {
    console.error('[registerItem] Erro:', error);
    throw new Error(error.message || 'Erro ao registrar item');
  }
  
  console.log('[registerItem] Item criado com sucesso:', data[0]);
  return data[0];
}

export async function deleteItem(id) {
  // Primeiro deleta fotos associadas
  await supabase.from('item_photos').delete().eq('item_id', id);
  
  // Depois deleta mensagens associadas
  await supabase.from('messages').delete().eq('item_id', id);
  
  // Por fim, deleta o item
  const { data, error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .select();
  
  if (error) {
    throw new Error(error.message || 'Erro ao deletar item');
  }
  return data;
}

export async function updateItem(id, item) {
  const { data, error } = await supabase
    .from('items')
    .update(item)
    .eq('id', id)
    .select();
  
  if (error) {
    throw new Error(error.message || 'Erro ao atualizar item');
  }
  return data[0];
}

export async function analyzeImage(file) {
  // TODO: Migrar para Supabase Edge Function se necessário
  // Por enquanto, retorna null (desabilitado)
  throw new Error('Análise de imagem desabilitada. Migre para Supabase Edge Function.');
}

// Salva registro de foto associado a um item
export async function saveItemPhoto(itemId, url) {
  console.log('[saveItemPhoto] Salvando referência de foto para item:', itemId);
  
  const { data, error } = await supabase
    .from('item_photos')
    .insert([{ item_id: itemId, url }])
    .select();
  
  if (error) {
    console.error('[saveItemPhoto] Erro ao salvar foto:', error);
    throw new Error(error.message || 'Erro ao salvar foto');
  }
  
  console.log('[saveItemPhoto] Foto salva com sucesso:', data[0]);
  return data[0];
}
