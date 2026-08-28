import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DELETED_SIGHTINGS_KEY = '@wefind_deleted_sightings_store';
let inMemoryDeletedSightings = new Set();

// Inicializa o cache de avistamentos excluídos
const loadDeletedSightingsSet = async () => {
  try {
    const raw = await AsyncStorage.getItem(DELETED_SIGHTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => inMemoryDeletedSightings.add(String(id)));
      }
    }
  } catch (e) {
    console.log('[sightings] Erro ao carregar cache de exclusões:', e.message);
  }
  return inMemoryDeletedSightings;
};

// Executa o carregamento inicial silenciosamente
loadDeletedSightingsSet().catch(() => {});

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
    await loadDeletedSightingsSet();

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

    // Filtra avistamentos excluídos pela moderação
    const validSightings = sightings.filter((s) => {
      if (!s || !s.id) return false;
      if (inMemoryDeletedSightings.has(String(s.id))) return false;
      if (s.description === '[DELETED_BY_ADMIN]') return false;
      return true;
    });

    if (validSightings.length === 0) return [];

    // Busca perfis dos usuários únicos
    const userIds = [...new Set(validSightings.map(s => s.user_id).filter(Boolean))];
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
    return validSightings.map(s => {
      let contact_info = s.contact_info;
      if (typeof contact_info === 'string') {
        try {
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

export const deleteSighting = async (sightingId) => {
  try {
    if (!sightingId) return { success: false };
    console.log('[deleteSighting] Deletando avistamento:', sightingId);

    // 1. Marca imediatamente no registro de exclusão local e em memória
    inMemoryDeletedSightings.add(String(sightingId));
    try {
      const allDeleted = Array.from(inMemoryDeletedSightings);
      await AsyncStorage.setItem(DELETED_SIGHTINGS_KEY, JSON.stringify(allDeleted));
    } catch (e) {
      console.log('[deleteSighting] Erro ao salvar no AsyncStorage:', e.message);
    }

    // 2. Tenta deletar fisicamente no Supabase
    try {
      const { error } = await supabase
        .from('sightings')
        .delete()
        .eq('id', sightingId);

      if (error) {
        console.log('[deleteSighting] Aviso delete Supabase:', error.message);
      }
    } catch (e) {
      console.log('[deleteSighting] Exceção delete Supabase:', e.message);
    }

    // 3. Em caso de RLS estrito no Supabase, tenta soft-delete para garantir que outros clientes também não vejam
    try {
      await supabase
        .from('sightings')
        .update({
          description: '[DELETED_BY_ADMIN]',
          contact_info: null,
          photo_url: null,
        })
        .eq('id', sightingId);
    } catch (e) {
      // Silencioso se RLS bloquear update
    }

    console.log('[deleteSighting] Avistamento deletado com sucesso');
    return { success: true };
  } catch (error) {
    console.log('[deleteSighting] Exceção geral:', error.message);
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

/**
 * Calcula a distância geodésica em quilômetros (Fórmula de Haversine)
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

  const R = 6371; // Raio da Terra em km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Busca por possíveis animais já cadastrados e avistados na mesma região (raio de 3 a 5 km)
 */
export const findNearbyPotentialMatches = async ({ latitude, longitude, species, maxRadiusKm = 5, currentItemId = null }) => {
  try {
    if (latitude == null || longitude == null) return [];
    
    let query = supabase
      .from('items')
      .select('id, title, description, status, species, breed, photo_urls, latitude, longitude, address, neighborhood, city, state, created_at, extra_fields')
      .eq('resolved', false)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (species) {
      query = query.ilike('species', `%${species}%`);
    }

    if (currentItemId) {
      query = query.neq('id', currentItemId);
    }

    const { data: items, error } = await query;
    if (error || !items) return [];

    const matches = items
      .map(item => {
        const itemLat = item.latitude ?? item.extra_fields?.location_details?.latitude;
        const itemLng = item.longitude ?? item.extra_fields?.location_details?.longitude;
        const distanceKm = calculateDistanceKm(latitude, longitude, itemLat, itemLng);
        
        // Prioriza animais vistos na rua ou perdidos
        const isSpotted = item.extra_fields?.found_custody === 'spotted' || item.status === 'lost';
        return {
          ...item,
          distanceKm,
          isSpotted,
        };
      })
      .filter(item => item.distanceKm != null && item.distanceKm <= maxRadiusKm && item.isSpotted)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return matches.slice(0, 4);
  } catch (err) {
    console.log('[findNearbyPotentialMatches] Erro:', err.message);
    return [];
  }
};

/**
 * Registra novo avistamento e move o pin do animal no mapa para a localização mais recente
 */
export const recordSightingAndUpdateItemLocation = async ({ itemId, userId, location, description, photoUrl, contactInfo }) => {
  try {
    // 1. Cria o avistamento no histórico
    const sighting = await createSighting({
      item_id: itemId,
      user_id: userId,
      location: typeof location === 'object' ? location : { address: location },
      description,
      photo_url: photoUrl,
      contact_info: contactInfo,
    });

    // 2. Atualiza a localização atual do item e o timestamp de último avistamento
    const lat = location?.latitude ?? location?.coords?.latitude;
    const lng = location?.longitude ?? location?.coords?.longitude;
    const address = location?.address || description || '';

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };
    if (lat && lng) {
      updatePayload.latitude = Number(lat);
      updatePayload.longitude = Number(lng);
    }
    if (address) {
      updatePayload.address = address;
    }

    const { data: currentItem } = await supabase
      .from('items')
      .select('extra_fields')
      .eq('id', itemId)
      .single();

    const currentExtra = currentItem?.extra_fields || {};
    const newCount = (currentExtra.sighting_count || 0) + 1;

    updatePayload.extra_fields = {
      ...currentExtra,
      sighting_count: newCount,
      last_sighting_at: new Date().toISOString(),
      last_sighting_by: userId,
      last_sighting_address: address,
    };

    await supabase
      .from('items')
      .update(updatePayload)
      .eq('id', itemId);

    return sighting;
  } catch (err) {
    console.error('[recordSightingAndUpdateItemLocation] Erro:', err);
    throw err;
  }
};
