export const updateSighting = async (sightingId, updates) => {
  try {
    let contact_info = updates.contact_info;
    if (contact_info && typeof contact_info !== 'string') {
      try {
        contact_info = JSON.stringify(contact_info);
      } catch {
        contact_info = '';
      }
    }
    const updatePayload = { ...updates, contact_info, updated_at: new Date().toISOString() };
    console.log('[updateSighting] Atualizando avistamento:', sightingId, updatePayload);
    const { data, error } = await supabase
      .from('sightings')
      .update(updatePayload)
      .eq('id', sightingId)
      .select();
    if (error) {
      console.log('[updateSighting] Erro:', error.message);
      throw error;
    }
    console.log('[updateSighting] Avistamento atualizado com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.log('[updateSighting] Exceção:', error.message);
    throw error;
  }
};
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const createSighting = async (sightingData) => {
  try {
    console.log('[createSighting] Criando novo avistamento...');

    // Garante que contact_info será sempre um objeto (JSON)
    let contact_info = sightingData.contact_info;
    if (contact_info && typeof contact_info !== 'object') {
      try {
        contact_info = JSON.parse(contact_info);
      } catch {
        contact_info = { raw: String(contact_info) };
      }
    }
    const { data, error } = await supabase
      .from('sightings')
      .insert({
        item_id: sightingData.item_id,
        user_id: sightingData.user_id,
        location: sightingData.location,
        description: sightingData.description,
        contact_info,
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
    // Busca todos os avistamentos do item
    const { data: sightings, error } = await supabase
      .from('sightings')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('[getSightings] Erro:', error.message);
      return [];
    }
    if (!sightings || sightings.length === 0) return [];

    // Busca perfis dos usuários únicos
    const userIds = [...new Set(sightings.map(s => s.user_id).filter(Boolean))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds.map(String));
      if (!profileError && profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Monta resultado, parseando contact_info se for JSON
    return sightings.map(s => {
      let contact_info = s.contact_info;
      if (typeof contact_info === 'string') {
        try {
          // Tenta parsear como JSON, se falhar mantém string
          const parsed = JSON.parse(contact_info);
          if (typeof parsed === 'object' && parsed !== null) {
            contact_info = parsed;
          }
        } catch {}
      }
      return {
        ...s,
        contact_info,
        profiles: profilesMap[s.user_id] || null,
      };
    });
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
    if (!photoUri) throw new Error('photoUri indefinido');
    let uri = photoUri;
    if (!uri.startsWith('file://')) uri = 'file://' + uri;

    const ext = photoUri.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const filepath = `sightings/${sightingId}/${timestamp}.${ext}`;

    // Lê o arquivo como base64 e converte para Uint8Array
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.log('[uploadSightingPhoto] Arquivo não encontrado:', uri);
      throw new Error('Arquivo não encontrado no caminho: ' + uri);
    }
    const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Upload para Supabase Storage
    const { error } = await supabase.storage
      .from('sightings')
      .upload(filepath, fileBuffer, {
        upsert: true,
        contentType: `image/${ext}`,
      });

    if (error) {
      console.log('[uploadSightingPhoto] Upload error:', error.message);
      throw new Error('Erro ao enviar foto para o Supabase Storage.');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('sightings')
      .getPublicUrl(filepath);

    if (!urlData || !urlData.publicUrl) {
      console.log('[uploadSightingPhoto] Falha ao obter URL pública:', urlData);
      throw new Error('URL pública não gerada.');
    }
    console.log('[uploadSightingPhoto] Foto enviada com sucesso:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.log('[uploadSightingPhoto] Exceção detalhada:', error);
    throw error;
  }
};
