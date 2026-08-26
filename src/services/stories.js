import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_STORIES_KEY = '@wefind_user_submitted_stories';

export const listSuccessStories = async () => {
  try {
    let remoteStories = [];
    try {
      const { data, error } = await supabase
        .from('success_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteStories = data.map((item) => ({
          id: item.id || `story-${Math.random()}`,
          petName: item.pet_name || item.title || 'Pet',
          author: item.tutor_name || item.author || 'Tutor',
          location: item.location || 'Brasil',
          testimonial: item.testimonial || item.story || '',
          photoUrl: item.photo_url || item.image_url || null,
          rating: Number(item.rating) || 5,
          createdAt: item.created_at,
          itemId: item.item_id || null,
        }));
      }
    } catch (e) {
      console.log('[stories] Tabela remota success_stories não disponível, usando armazenamento local:', e.message);
    }

    // Carrega histórias enviadas localmente pelo usuário no app
    let localStories = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORIES_KEY);
      if (raw) {
        localStories = JSON.parse(raw);
      }
    } catch (e) {
      console.log('[stories] Erro ao carregar histórias locais:', e.message);
    }

    // Combina histórias remotas e locais evitando duplicatas
    const ids = new Set(remoteStories.map((s) => String(s.id)));
    const uniqueLocal = localStories.filter((s) => !ids.has(String(s.id)));

    return [...uniqueLocal, ...remoteStories];
  } catch (error) {
    console.warn('[stories] Erro ao listar histórias:', error.message);
    return [];
  }
};

export const submitSuccessStory = async ({
  petName,
  author,
  location,
  testimonial,
  photoUrl,
  rating = 5,
  userId = null,
  itemId = null,
}) => {
  try {
    const newStory = {
      id: `local-story-${Date.now()}`,
      petName: String(petName || '').trim(),
      author: String(author || '').trim(),
      location: String(location || '').trim() || 'Brasil',
      testimonial: String(testimonial || '').trim(),
      photoUrl: photoUrl || null,
      rating: Number(rating) || 5,
      createdAt: new Date().toISOString(),
      userId,
      itemId,
    };

    // Tenta salvar no Supabase
    try {
      await supabase.from('success_stories').insert({
        pet_name: newStory.petName,
        tutor_name: newStory.author,
        location: newStory.location,
        testimonial: newStory.testimonial,
        photo_url: newStory.photoUrl,
        rating: newStory.rating,
        user_id: userId,
        item_id: itemId,
      });
    } catch (remoteError) {
      console.log('[stories] Aviso ao salvar história remota no Supabase:', remoteError.message);
    }

    // Salva no AsyncStorage local
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORIES_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [newStory, ...existing];
      await AsyncStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(updated));
    } catch (storageError) {
      console.log('[stories] Erro ao salvar história localmente:', storageError.message);
    }

    return newStory;
  } catch (error) {
    console.error('[stories] Erro ao submeter história:', error.message);
    throw error;
  }
};
