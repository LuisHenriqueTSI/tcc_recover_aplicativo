import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const getUser = async (userId) => {
  try {

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

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
      .maybeSingle();

    if (error) {
      console.log('[getUserById] Error:', error.message);
      return null;
    }

    // avatar_url já é a url pública
    let avatarUrl = data?.avatar_url || null;
    return { ...data, avatarUrl };
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

export const uploadAvatar = async (userId, photoUri) => {
  try {
    console.log('[uploadAvatar] Enviando avatar para:', userId);

    if (!photoUri) throw new Error('photoUri indefinido');

    // Garante que a URI está no formato correto
    let uri = photoUri;
    if (!uri.startsWith('file://')) uri = 'file://' + uri;

    const filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
    const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
    const filepath = `${userId}/avatar.${ext}`;

    // Usa expo-file-system para ler o arquivo como Uint8Array (base64 -> Uint8Array)
    let fileBuffer;
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Arquivo não encontrado no caminho: ' + uri);
      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
      console.log('[uploadAvatar] File lido como Uint8Array, tamanho:', fileBuffer.length);
    } catch (fsErr) {
      console.log('[uploadAvatar] Erro ao ler arquivo com expo-file-system:', fsErr, 'URI:', uri);
      throw fsErr;
    }

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(filepath, fileBuffer, {
        upsert: true,
        contentType: `image/${ext}`,
      });

    if (error) {
      console.log('[uploadAvatar] Upload error:', error.message);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filepath);

    // Atualiza o campo avatar_url no perfil do usuário
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData?.publicUrl || null })
      .eq('id', userId);
    if (updateError) {
      console.log('[uploadAvatar] Erro ao atualizar avatar_url no perfil:', updateError.message);
      throw updateError;
    }

    console.log('[uploadAvatar] Avatar uploaded successfully');
    return urlData.publicUrl;
  } catch (error) {
    console.log('[uploadAvatar] Exception:', error.message);
    throw error;
  }
};
