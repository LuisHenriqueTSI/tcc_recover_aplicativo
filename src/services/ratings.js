import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNotification } from './notifications';
import { sendPushNotification } from './pushNotifications';

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

const RATING_INACTIVITY_MS = 24 * 60 * 60 * 1000;
const RATING_NOTIFICATION_TYPE = 'rating_available';

export const canRateUser = async (reviewerId, targetUserId) => {
  if (!reviewerId || !targetUserId || reviewerId === targetUserId) return false;

  try {
    const [sentResult, receivedResult] = await Promise.all([
      supabase
        .from('messages')
        .select('sent_at')
        .eq('sender_id', reviewerId)
        .eq('receiver_id', targetUserId)
        .order('sent_at', { ascending: false })
        .limit(1),
      supabase
        .from('messages')
        .select('sent_at')
        .eq('sender_id', targetUserId)
        .eq('receiver_id', reviewerId)
        .order('sent_at', { ascending: false })
        .limit(1),
    ]);

    if (sentResult.error) throw sentResult.error;
    if (receivedResult.error) throw receivedResult.error;

    const timestamps = [
      sentResult.data?.[0]?.sent_at,
      receivedResult.data?.[0]?.sent_at,
    ]
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);

    if (timestamps.length === 0) return false;
    return Date.now() - Math.max(...timestamps) >= RATING_INACTIVITY_MS;
  } catch (error) {
    console.warn('[ratings] Não foi possível verificar a conclusão da conversa:', error.message);
    return false;
  }
};

export const syncRatingNotifications = async (userId) => {
  if (!userId) return [];

  const { data: messages, error } = await supabase
    .from('messages')
    .select('sender_id, receiver_id, sent_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('sent_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const latestByUser = new Map();
  (messages || []).forEach((message) => {
    const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    if (!otherUserId || latestByUser.has(otherUserId)) return;
    latestByUser.set(otherUserId, message.sent_at);
  });

  const notificationTypes = Array.from(latestByUser.keys())
    .map((otherUserId) => `${RATING_NOTIFICATION_TYPE}:${otherUserId}`);
  const { data: existingNotifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('type')
    .eq('user_id', userId)
    .in('type', notificationTypes.length > 0 ? notificationTypes : [RATING_NOTIFICATION_TYPE]);

  if (notificationsError) throw notificationsError;

  const existingTypes = new Set((existingNotifications || []).map((notification) => notification.type));
  const created = [];

  for (const [otherUserId, sentAt] of latestByUser.entries()) {
    if (Date.now() - new Date(sentAt).getTime() < RATING_INACTIVITY_MS) continue;

    const notificationType = `${RATING_NOTIFICATION_TYPE}:${otherUserId}`;
    if (existingTypes.has(notificationType)) continue;

    const notification = await createNotification({
      user_id: userId,
      type: notificationType,
      title: 'Classificação disponível',
      message: 'Sua conversa foi concluída. Você já pode registrar uma classificação.',
    });
    if (notification) {
      created.push(notification);
      await sendPushNotification(
        userId,
        'Classificação disponível',
        'Sua conversa foi concluída. Aproveite para classificar sua experiência.',
        { type: RATING_NOTIFICATION_TYPE, targetUserId: otherUserId }
      );
    }
  }

  return created;
};

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

  if (!(await canRateUser(reviewerId, targetUserId))) {
    throw new Error('A classificação será liberada após 24 horas sem novas mensagens entre vocês.');
  }

  const { data: existingRemoteRating, error: existingRemoteError } = await supabase
    .from('user_ratings')
    .select('id')
    .eq('target_user_id', targetUserId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  if (existingRemoteError) throw existingRemoteError;
  if (existingRemoteRating) {
    throw new Error('Você já enviou sua classificação para este membro. Ela não pode ser editada.');
  }

  const localRaw = await AsyncStorage.getItem(LOCAL_RATINGS_KEY);
  const localRatings = localRaw ? JSON.parse(localRaw) : [];
  if (localRatings.some((rating) => rating.targetUserId === targetUserId && rating.reviewerId === reviewerId)) {
    throw new Error('Você já enviou sua classificação para este membro. Ela não pode ser editada.');
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
    const { error } = await supabase.from('user_ratings').insert({
      target_user_id: targetUserId,
      reviewer_id: reviewerId,
      reviewer_name: newRating.reviewerName,
      reviewer_avatar: newRating.reviewerAvatar,
      stars: safeStars,
      tags: newRating.tags,
      comment: newRating.comment,
      created_at: newRating.createdAt,
    });
    if (error) throw error;
  } catch (remoteErr) {
    console.log('[ratings] Aviso ao salvar no Supabase:', remoteErr.message);
  }

  // 2. Salva no AsyncStorage local
  try {
    const existing = localRaw ? JSON.parse(localRaw) : [];
    const updated = [newRating, ...existing];
    await AsyncStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(updated));
  } catch (localErr) {
    console.log('[ratings] Erro no AsyncStorage:', localErr.message);
  }

  return newRating;
};

export const deleteUserRating = async (ratingId, targetUserId) => {
  try {
    if (!ratingId) return false;
    console.log('[ratings] Excluindo avaliação:', ratingId);

    // 1. Tenta excluir do Supabase
    try {
      await supabase
        .from('user_ratings')
        .delete()
        .eq('id', ratingId);
    } catch (e) {
      console.log('[ratings] Aviso ao excluir do Supabase:', e.message);
    }

    // 2. Exclui do AsyncStorage local
    try {
      const raw = await AsyncStorage.getItem(LOCAL_RATINGS_KEY);
      if (raw) {
        const existing = JSON.parse(raw);
        const filtered = existing.filter(r => String(r.id) !== String(ratingId));
        await AsyncStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.log('[ratings] Erro ao remover do AsyncStorage:', e.message);
    }

    return true;
  } catch (error) {
    console.error('[ratings] Erro ao excluir avaliação:', error.message);
    throw error;
  }
};
