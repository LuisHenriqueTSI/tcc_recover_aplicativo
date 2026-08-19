// Remove uma foto específica de um item (banco e storage)
import { supabase } from '../lib/supabase';

export const removeItemPhoto = async (photoId, photoUrl) => {
  try {
    // Remove do storage
    if (photoUrl) {
      try {
        const url = new URL(photoUrl);
        const filepath = url.pathname.split('/item-photos/')[1];
        if (filepath) {
          await supabase.storage.from('item-photos').remove([filepath]);
        }
      } catch (err) {
        console.error('[removeItemPhoto] Erro ao remover foto do storage:', err);
      }
    }
    // Remove do banco
    await supabase.from('item_photos').delete().eq('id', photoId);
  } catch (err) {
    console.error('[removeItemPhoto] Erro geral:', err);
  }
};
