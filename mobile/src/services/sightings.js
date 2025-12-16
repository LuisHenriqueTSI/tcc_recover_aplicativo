import { supabase } from '../lib/supabase';

export const createSighting = async (sightingData) => {
  try {
    console.log('[createSighting] Criando novo avistamento...');

    const { data, error } = await supabase
      .from('sightings')
      .insert({
        item_id: sightingData.item_id,
        user_id: sightingData.user_id,
        location: sightingData.location,
        description: sightingData.description,
        contact_info: sightingData.contact_info,
        photo_url: sightingData.photo_url,
      })
      .select()
      .single();

    if (error) {
      console.log('[createSighting] Erro:', error.message);
      throw error;
    }

    console.log('[createSighting] Avistamento criado com sucesso');
    return data;
  } catch (error) {
    console.log('[createSighting] Exceção:', error.message);
    throw error;
  }
};

export const getSightings = async (itemId) => {
  try {
    const { data, error } = await supabase
      .from('sightings')
      .select(`
        *,
        profiles(id, name, avatar_url)
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('[getSightings] Erro:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.log('[getSightings] Exceção:', error.message);
    return [];
  }
};

export const deleteSighting = async (sightingId) => {
  try {
    console.log('[deleteSighting] Deletando avistamento:', sightingId);

    const { error } = await supabase
      .from('sightings')
      .delete()
      .eq('id', sightingId);

    if (error) {
      console.log('[deleteSighting] Erro:', error.message);
      throw error;
    }

    console.log('[deleteSighting] Avistamento deletado com sucesso');
    return { success: true };
  } catch (error) {
    console.log('[deleteSighting] Exceção:', error.message);
    throw error;
  }
};

export const uploadSightingPhoto = async (sightingId, photoUri) => {
  try {
    console.log('[uploadSightingPhoto] Enviando foto do avistamento...');

    const filename = photoUri.split('/').pop();
    const ext = filename.split('.').pop();
    const filepath = `sightings/${sightingId}/${Date.now()}.${ext}`;

    const response = await fetch(photoUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('sightings')
      .upload(filepath, blob, {
        contentType: `image/${ext}`,
      });

    if (error) {
      console.log('[uploadSightingPhoto] Upload error:', error.message);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('sightings')
      .getPublicUrl(filepath);

    console.log('[uploadSightingPhoto] Foto enviada com sucesso');
    return urlData.publicUrl;
  } catch (error) {
    console.log('[uploadSightingPhoto] Exceção:', error.message);
    throw error;
  }
};
