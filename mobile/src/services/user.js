import { supabase } from '../lib/supabase';

export const getUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('[getUser] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.log('[getUser] Exception:', error.message);
    return null;
  }
};

export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('[getUserById] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.log('[getUserById] Exception:', error.message);
    return null;
  }
};

export const updateProfile = async (userId, updates) => {
  try {
    console.log('[updateProfile] Atualizando perfil do usuário:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log('[updateProfile] Error:', error.message);
      throw error;
    }

    console.log('[updateProfile] Perfil atualizado com sucesso');
    return data;
  } catch (error) {
    console.log('[updateProfile] Exception:', error.message);
    throw error;
  }
};

export const uploadAvatar = async (userId, uri) => {
  try {
    console.log('[uploadAvatar] Enviando avatar para:', userId);

    // Extract filename from URI
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop();
    const filepath = `${userId}/avatar.${ext}`;

    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filepath, blob, {
        upsert: true,
        contentType: `image/${ext}`,
      });

    if (error) {
      console.log('[uploadAvatar] Upload error:', error.message);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filepath);

    console.log('[uploadAvatar] Avatar uploaded successfully');
    return urlData.publicUrl;
  } catch (error) {
    console.log('[uploadAvatar] Exception:', error.message);
    throw error;
  }
};
