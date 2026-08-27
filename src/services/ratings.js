import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_RATINGS_KEY = '@wefind_user_ratings_store';

export const POPULAR_RATING_TAGS = [
  '❤️ Muito Atencioso(a)',
  '⚡ Respondeu Rápido',
  '🛡️ Tutor Confiável',
  '🐾 Ajudou no Resgate',
  '💬 Ótima Comunicação',
  '🤝 Muito Pontual',
  '⭐ Recomendo a Todos',
];

export const getUserRatings = async (targetUserId) => {
  if (!targetUserId) return { ratings: [], average: 5.0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

  try {
    let remoteRatings = [];
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteRatings = data.map(r => ({
          id: r.id,
          targetUserId: r.target_user_id,
          reviewerId: r.reviewer_id,
          reviewerName: r.reviewer_name || 'Membro da Comunidade',
          reviewerAvatar: r.reviewer_avatar || null,
          stars: Number(r.stars) || 5,
          tags: Array.isArray(r.tags) ? r.tags : (r.tags ? JSON.parse(r.tags) : []),
          comment: r.comment || '',
          createdAt: r.created_at,
        }));
      }
    } catch (e) {
      console.log('[ratings] Tabela remota user_ratings:', e.message);
    }

    // Carrega avaliações armazenadas localmente
    let localRatings = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_RATINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        localRatings = (parsed || []).filter(r => r.targetUserId === targetUserId);
      }
    } catch (e) {
      console.log('[ratings] Erro ao carregar avaliações locais:', e.message);
    }

    // Combina remotas e locais evitando duplicatas
    const ids = new Set(remoteRatings.map(r => String(r.id)));
    const uniqueLocal = localRatings.filter(r => !ids.has(String(r.id)));
    const allRatings = [...uniqueLocal, ...remoteRatings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Calcula métricas
    const total = allRatings.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    allRatings.forEach(r => {
      const s = Math.max(1, Math.min(5, Math.round(r.stars || 5)));
      breakdown[s] = (breakdown[s] || 0) + 1;
      sum += s;
    });

    const average = total > 0 ? (sum / total).toFixed(1) : '5.0';

    return {
      ratings: allRatings,
      average: Number(average),
      total,
      breakdown,
    };
  } catch (error) {
    console.warn('[ratings] Erro ao buscar avaliações:', error.message);
    return { ratings: [], average: 5.0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  }
};

export const submitUserRating = async ({
  targetUserId,
  reviewerId,
  reviewerName,
  reviewerAvatar,
  stars = 5,
  tags = [],
  comment = '',
}) => {
  if (!targetUserId || !reviewerId) {
    throw new Error('Usuário avaliado e avaliador são obrigatórios.');
  }

  if (targetUserId === reviewerId) {
    throw new Error('Você não pode avaliar seu próprio perfil.');
  }

  const safeStars = Math.max(1, Math.min(5, Number(stars) || 5));
  const newRating = {
    id: `rating-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetUserId,
    reviewerId,
    reviewerName: reviewerName || 'Membro WeFIND',
    reviewerAvatar: reviewerAvatar || null,
    stars: safeStars,
    tags: Array.isArray(tags) ? tags : [],
    comment: String(comment || '').trim(),
    createdAt: new Date().toISOString(),
  };

  // 1. Tenta salvar no Supabase
  try {
    await supabase.from('user_ratings').upsert({
      target_user_id: targetUserId,
      reviewer_id: reviewerId,
      reviewer_name: newRating.reviewerName,
      reviewer_avatar: newRating.reviewerAvatar,
      stars: safeStars,
      tags: newRating.tags,
      comment: newRating.comment,
      created_at: newRating.createdAt,
    }, { onConflict: 'target_user_id,reviewer_id' });
  } catch (remoteErr) {
    console.log('[ratings] Aviso ao salvar no Supabase:', remoteErr.message);
  }

  // 2. Salva no AsyncStorage local
  try {
    const raw = await AsyncStorage.getItem(LOCAL_RATINGS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    // Substitui se o mesmo reviewer já havia avaliado este target
    const filtered = existing.filter(r => !(r.targetUserId === targetUserId && r.reviewerId === reviewerId));
    const updated = [newRating, ...filtered];
    await AsyncStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(updated));
  } catch (localErr) {
    console.log('[ratings] Erro no AsyncStorage:', localErr.message);
  }

  return newRating;
};
