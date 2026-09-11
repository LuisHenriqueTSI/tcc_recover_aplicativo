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
          userId: item.user_id || null,
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

export const getStoryLikeState = async (stories, userId) => {
  const storyIds = (stories || [])
    .map((story) => String(story.id || ''))
    .filter(Boolean);

  if (storyIds.length === 0) return {};

  const { data, error } = await supabase
    .from('success_story_likes')
    .select('story_id, user_id')
    .in('story_id', storyIds);

  if (error) throw error;

  return storyIds.reduce((state, storyId) => {
    const likes = (data || []).filter((like) => String(like.story_id) === storyId);
    state[storyId] = {
      count: likes.length,
      likedByUser: Boolean(userId && likes.some((like) => String(like.user_id) === String(userId))),
    };
    return state;
  }, {});
};

export const toggleStoryLike = async (storyId, userId, likedByUser) => {
  if (!storyId || !userId) throw new Error('É necessário estar logado para curtir uma história.');

  if (likedByUser) {
    const { error } = await supabase
      .from('success_story_likes')
      .delete()
      .eq('story_id', String(storyId))
      .eq('user_id', String(userId));
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('success_story_likes')
      .insert({ story_id: String(storyId), user_id: String(userId) });
    if (error) throw error;
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

    let remoteStory = null;

    // Salva no Supabase e usa o ID remoto para habilitar curtidas e interações.
    try {
      const { data, error } = await supabase.from('success_stories').insert({
        pet_name: newStory.petName,
        tutor_name: newStory.author,
        location: newStory.location,
        testimonial: newStory.testimonial,
        photo_url: newStory.photoUrl,
        rating: newStory.rating,
        user_id: userId,
        item_id: itemId,
      }).select('id, created_at').single();

      if (error) throw error;
      remoteStory = data;
    } catch (remoteError) {
      console.warn('[stories] Não foi possível salvar a história no Supabase:', remoteError.message);
    }

    const savedStory = remoteStory
      ? { ...newStory, id: String(remoteStory.id), createdAt: remoteStory.created_at || newStory.createdAt }
      : newStory;

    // Mantém uma cópia local para o mural funcionar mesmo offline.
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORIES_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [savedStory, ...existing];
      await AsyncStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(updated));
    } catch (storageError) {
      console.log('[stories] Erro ao salvar história localmente:', storageError.message);
    }

    return savedStory;
  } catch (error) {
    console.error('[stories] Erro ao submeter história:', error.message);
    throw error;
  }
};

export const deleteSuccessStory = async (storyId) => {
  try {
    if (!storyId) return false;

    // 1. Tenta excluir do Supabase caso seja remoto
    try {
      await supabase.from('success_stories').delete().eq('id', storyId);
    } catch (e) {
      console.log('[stories] Aviso ao excluir do Supabase:', e.message);
    }

    // 2. Remove do armazenamento local
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORIES_KEY);
      if (raw) {
        const existing = JSON.parse(raw);
        const filtered = existing.filter((s) => String(s.id) !== String(storyId));
        await AsyncStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.log('[stories] Erro ao excluir do AsyncStorage:', e.message);
    }

    return true;
  } catch (error) {
    console.error('[stories] Erro ao excluir história:', error.message);
    throw error;
  }
};
