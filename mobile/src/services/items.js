import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const registerItem = async (itemData, photos = []) => {
  try {
    console.log('[registerItem] Registrando novo item...');
    console.log('[registerItem] Dados do item:', itemData);

    const { data, error } = await supabase
      .from('items')
      .insert({
        owner_id: itemData.owner_id,
        title: itemData.title,
        description: itemData.description,
        category: itemData.category,
        item_type: itemData.item_type,
        status: itemData.status,
        location: itemData.location,
        latitude: itemData.latitude,
        longitude: itemData.longitude,
        date: itemData.date,
        extra_fields: itemData.extra_fields || {},
        resolved: false,
      })
      .select();

    if (error) {
      console.log('[registerItem] Erro ao criar item:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Item não foi criado');
    }

    const createdItem = data[0];
    console.log('[registerItem] Item criado com ID:', createdItem.id);
    const itemId = createdItem.id;

    // Upload photos if provided
    for (const photo of photos) {
      await saveItemPhoto(itemId, photo);
    }

    return createdItem;
  } catch (error) {
    console.log('[registerItem] Exceção:', error.message);
    throw error;
  }
};

export const updateItem = async (itemId, itemData) => {
  try {
    console.log('[updateItem] Atualizando item:', itemId);

    const { data, error } = await supabase
      .from('items')
      .update(itemData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.log('[updateItem] Erro:', error.message);
      throw error;
    }

    console.log('[updateItem] Item atualizado com sucesso');
    return data;
  } catch (error) {
    console.log('[updateItem] Exceção:', error.message);
    throw error;
  }
};

export const saveItemPhoto = async (itemId, photo) => {
  try {
    console.log('[saveItemPhoto] Salvando foto para item:', itemId);
    console.log('[saveItemPhoto] Photo object:', photo);

    const photoUri = photo.uri || photo;
    const photoName = photo.name || `photo_${Date.now()}.jpg`;
    const ext = photoName.split('.').pop() || 'jpg';
    const filepath = `${itemId}/${Date.now()}.${ext}`;

    console.log('[saveItemPhoto] Photo URI:', photoUri);
    console.log('[saveItemPhoto] File path:', filepath);

    // Check file info (size) for debugging
    const info = await FileSystem.getInfoAsync(photoUri, { size: true });
    console.log('[saveItemPhoto] File exists:', info.exists, 'Size:', info.size);

    // Upload via REST using expo-file-system to avoid Blob issues on RN/Hermes
    console.log('[saveItemPhoto] Fetching auth token...');
    const session = await supabase.auth.getSession();
    const accessToken = session?.data?.session?.access_token;
    if (!accessToken) {
      throw new Error('Sessão não encontrada para upload');
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/item-photos/${filepath}`;
    console.log('[saveItemPhoto] Uploading via FileSystem to:', uploadUrl);

    const uploadResponse = await FileSystem.uploadAsync(uploadUrl, photoUri, {
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': photo.type || `image/${ext}`,
        'x-upsert': 'false',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    console.log('[saveItemPhoto] Upload response status:', uploadResponse.status);
    if (uploadResponse.status >= 400) {
      console.error('[saveItemPhoto] Upload failed body:', uploadResponse.body);
      throw new Error(`Upload falhou: ${uploadResponse.status}`);
    }

    console.log('[saveItemPhoto] Upload successful');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('item-photos')
      .getPublicUrl(filepath);

    console.log('[saveItemPhoto] Public URL:', urlData.publicUrl);

    // Save reference to database
    const { error: dbError } = await supabase
      .from('item_photos')
      .insert({
        item_id: itemId,
        url: urlData.publicUrl,
      });

    if (dbError) {
      console.error('[saveItemPhoto] Database error:', dbError);
      throw dbError;
    }

    console.log('[saveItemPhoto] Photo saved successfully');
    return urlData.publicUrl;
  } catch (error) {
    console.error('[saveItemPhoto] Exception:', error.message);
    console.error('[saveItemPhoto] Full error:', error);
    throw error;
  }
};

export const deleteItem = async (itemId) => {
  try {
    console.log('[deleteItem] Deleting item:', itemId);

    // First delete photos from storage and database
    const { data: photos, error: photosError } = await supabase
      .from('item_photos')
      .select('url')
      .eq('item_id', itemId);

    if (!photosError && photos) {
      for (const photo of photos) {
        try {
          // Extract filepath from URL
          const url = new URL(photo.url);
          const filepath = url.pathname.split('/item-photos/')[1];
          if (filepath) {
            await supabase.storage.from('item-photos').remove([filepath]);
          }
        } catch (err) {
          console.error('[deleteItem] Error deleting photo:', err);
        }
      }

      // Delete photo records
      await supabase.from('item_photos').delete().eq('item_id', itemId);
    }

    // Delete messages
    await supabase.from('messages').delete().eq('item_id', itemId);

    // Delete sightings
    await supabase.from('sightings').delete().eq('item_id', itemId);

    // Delete rewards
    await supabase.from('rewards').delete().eq('item_id', itemId);

    // Finally delete the item
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[deleteItem] Error:', error);
      throw error;
    }

    console.log('[deleteItem] Item deleted successfully');
    return true;
  } catch (error) {
    console.error('[deleteItem] Exception:', error);
    throw error;
  }
};

export const getItemById = async (itemId) => {
  try {
    console.log('[getItemById] Carregando item:', itemId);

    // Get item data
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      console.log('[getItemById] Erro ao carregar item:', itemError?.message);
      return null;
    }

    // Get photos separately
    const { data: photos } = await supabase
      .from('item_photos')
      .select('id, url')
      .eq('item_id', itemId);

    // Get owner profile separately
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email')
      .eq('id', itemData.owner_id)
      .single();

    // Combine data
    const result = {
      ...itemData,
      item_photos: photos || [],
      profiles: ownerProfile || null,
    };

    console.log('[getItemById] Item carregado com sucesso');
    return result;
  } catch (error) {
    console.log('[getItemById] Exceção:', error.message);
    return null;
  }
};

export const listItems = async (filters = {}) => {
  try {
    console.log('[listItems] Carregando itens com filtros:', filters);
    
    // Query básica sem joins para evitar erro 400 de RLS
    let query = supabase
      .from('items')
      .select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.log('[listItems] Erro na query:', error.message);
      return [];
    }

    console.log('[listItems] Itens carregados:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.log('[listItems] Exceção:', error.message);
    return [];
  }
};

// Carregar detalhes completos de um item (inclui fotos, perfil, recompensas)
export const getItemDetails = async (itemId) => {
  try {
    console.log('[getItemDetails] Carregando detalhes do item:', itemId);
    
    // Get the item first
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      console.log('[getItemDetails] Erro ao carregar item:', itemError?.message);
      return null;
    }

    // Get photos
    const { data: photos } = await supabase
      .from('item_photos')
      .select('id, url')
      .eq('item_id', itemId);

    // Get owner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email')
      .eq('id', item.owner_id)
      .single();

    // Get rewards
    const { data: rewards } = await supabase
      .from('rewards')
      .select('id, amount, currency, status')
      .eq('item_id', itemId);

    return {
      ...item,
      item_photos: photos || [],
      profiles: profile,
      rewards: rewards || []
    };
  } catch (error) {
    console.log('[getItemDetails] Exceção:', error.message);
    return null;
  }
};

export const searchItems = async (searchTerm) => {
  try {
    // Simple search without joins to avoid schema relationship errors
    const term = (searchTerm || '').trim();
    if (!term) return [];

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('[searchItems] Erro:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.log('[searchItems] Exceção:', error.message);
    return [];
  }
};

// Fetch first photo URL for a list of item IDs to use as thumbnails
export const getItemThumbnails = async (itemIds = []) => {
  try {
    if (!itemIds || itemIds.length === 0) return {};

    // Query photos for these items
    const { data, error } = await supabase
      .from('item_photos')
      .select('item_id, url')
      .in('item_id', itemIds);

    if (error) {
      console.log('[getItemThumbnails] Erro:', error.message);
      return {};
    }

    // Build map of item_id -> first url
    const map = {};
    for (const row of data || []) {
      if (!map[row.item_id]) {
        map[row.item_id] = row.url;
      }
    }
    return map;
  } catch (error) {
    console.log('[getItemThumbnails] Exceção:', error.message);
    return {};
  }
};

export const getUserItems = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_photos(id, url),
        rewards(id, amount, currency, status)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('[getUserItems] Erro:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.log('[getUserItems] Exceção:', error.message);
    return [];
  }
};

export const markItemAsResolved = async (itemId, userId) => {
  try {
    console.log('[markItemAsResolved] Marcando item como resolvido:', itemId);

    // Update item
    const { error: updateError } = await supabase
      .from('items')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (updateError) {
      console.log('[markItemAsResolved] Update error:', updateError.message);
      throw updateError;
    }

    // Increment user points
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points, level')
      .eq('id', userId)
      .single();

    if (!fetchError && profile) {
      const newPoints = profile.points + 10;
      const newLevel = Math.floor(newPoints / 100) + 1;

      await supabase
        .from('profiles')
        .update({
          points: newPoints,
          level: newLevel,
        })
        .eq('id', userId);
    }

    console.log('[markItemAsResolved] Item marcado como resolvido');
    return { success: true };
  } catch (error) {
    console.log('[markItemAsResolved] Exceção:', error.message);
    throw error;
  }
};

export const getResolvedStatistics = async () => {
  try {
    console.log('[getResolvedStatistics] Buscando estatísticas de itens resolvidos...');
    
    const { data: items, error } = await supabase
      .from('items')
      .select('category')
      .eq('resolved', true);
    
    if (error) throw error;
    
    // Contar por categoria
    const categoryCount = {};
    items.forEach(item => {
      const cat = item.category || 'object';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    const by_category = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    const total_resolved = items.length;
    
    // Calcular animais (category === 'animal')
    const animalsReunited = categoryCount['animal'] || 0;
    
    // Estimar pessoas conectadas (2.5 x total de itens resolvidos)
    const peopleConnected = Math.floor(total_resolved * 2.5);
    
    const result = {
      total_resolved,
      animalsReunited,
      peopleConnected,
      by_category
    };
    
    console.log('[getResolvedStatistics] Estatísticas:', result);
    return result;
  } catch (error) {
    console.error('[getResolvedStatistics] Erro:', error.message);
    throw error;
  }
};
