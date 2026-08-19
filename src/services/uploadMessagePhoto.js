
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const uploadMessagePhoto = async (messageId, photoUri) => {
  try {
    console.log('[uploadMessagePhoto] Enviando foto da mensagem...');

    if (!photoUri) throw new Error('photoUri indefinido');

    // Garante que a URI está no formato correto
    let uri = photoUri;
    if (!uri.startsWith('file://')) uri = 'file://' + uri;

    const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
    const filepath = `${messageId}/${Date.now()}.${ext}`;

    // Log de debug
    console.log('[uploadMessagePhoto] uri:', uri);
    console.log('[uploadMessagePhoto] filename:', filename);
    console.log('[uploadMessagePhoto] ext:', ext);
    console.log('[uploadMessagePhoto] filepath:', filepath);
    console.log('[uploadMessagePhoto] supabaseUrl:', supabase?.storage?.url || supabase?.url);
    try {
      const session = await supabase.auth.getSession();
      console.log('[uploadMessagePhoto] JWT (parcial):', session?.data?.session?.access_token?.slice(0, 20));
    } catch (e) {
      console.log('[uploadMessagePhoto] Não foi possível obter o token JWT:', e);
    }



    // Usa nova API File do expo-file-system para ler o arquivo como Uint8Array
    let fileBuffer;
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Arquivo não encontrado no caminho: ' + uri);
      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
      console.log('[uploadMessagePhoto] File lido como Uint8Array (legacy), tamanho:', fileBuffer.length);
    } catch (fsErr) {
      console.log('[uploadMessagePhoto] Erro ao ler arquivo com expo-file-system legacy:', fsErr, 'URI:', uri);
      throw fsErr;
    }

    // Upload para o bucket correto (usando Uint8Array)
    const { data, error } = await supabase.storage
      .from('chat-photos')
      .upload(filepath, fileBuffer, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (error) {
      console.log('[uploadMessagePhoto] Upload error:', error.message, error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('chat-photos')
      .getPublicUrl(filepath);

    console.log('[uploadMessagePhoto] Foto enviada com sucesso:', urlData?.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.log('[uploadMessagePhoto] Exceção:', error.message, error);
    throw error;
  }
};
