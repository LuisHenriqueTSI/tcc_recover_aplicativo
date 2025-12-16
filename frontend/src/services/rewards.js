import { supabase } from '../supabaseClient';

/**
 * Criar uma nova recompensa para um item
 * @param {string} itemId - ID do item
 * @param {Object} rewardData - Dados da recompensa
 * @returns {Object} Recompensa criada
 */
export async function createReward(itemId, rewardData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { amount, currency = 'BRL', description = '', expiresAt = null } = rewardData;

  if (!amount || amount <= 0) {
    throw new Error('O valor da recompensa deve ser maior que 0');
  }

  const rewardPayload = {
    item_id: itemId,
    owner_id: user.id,
    amount: parseFloat(amount),
    currency,
    description,
    status: 'active',
    expires_at: expiresAt,
  };

  console.log('[createReward] Criando recompensa:', rewardPayload);

  const { data, error } = await supabase
    .from('rewards')
    .insert([rewardPayload])
    .select();

  if (error) {
    console.error('[createReward] Erro:', error);
    throw new Error(error.message || 'Erro ao criar recompensa');
  }

  console.log('[createReward] Recompensa criada com sucesso:', data[0]);
  return data[0];
}

/**
 * Atualizar uma recompensa existente
 * @param {string} rewardId - ID da recompensa
 * @param {Object} updateData - Dados a atualizar
 * @returns {Object} Recompensa atualizada
 */
export async function updateReward(rewardId, updateData) {
  const { data, error } = await supabase
    .from('rewards')
    .update(updateData)
    .eq('id', rewardId)
    .select();

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar recompensa');
  }

  return data[0];
}

/**
 * Obter recompensa de um item
 * @param {string} itemId - ID do item
 * @returns {Object|null} Recompensa ou null
 */
export async function getRewardByItemId(itemId) {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('item_id', itemId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[getRewardByItemId] Erro:', error);
    return null;
  }

  return data || null;
}

/**
 * Listar recompensas do usuário (como proprietário)
 * @returns {Array} Lista de recompensas
 */
export async function getUserRewards() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('rewards')
    .select(`
      *,
      items:item_id (
        id,
        title,
        category
      )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUserRewards] Erro:', error);
    throw new Error(error.message || 'Erro ao buscar recompensas');
  }

  return data || [];
}

/**
 * Listar recompensas reivindicadas pelo usuário
 * @returns {Array} Lista de recompensas reivindicadas
 */
export async function getClaimedRewards() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('rewards')
    .select(`
      *,
      items:item_id (
        id,
        title,
        category
      )
    `)
    .eq('claimed_by', user.id)
    .order('claimed_at', { ascending: false });

  if (error) {
    console.error('[getClaimedRewards] Erro:', error);
    throw new Error(error.message || 'Erro ao buscar recompensas reivindicadas');
  }

  return data || [];
}

/**
 * Cancelar uma recompensa
 * @param {string} rewardId - ID da recompensa
 * @returns {Object} Recompensa cancelada
 */
export async function cancelReward(rewardId) {
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'cancelled' })
    .eq('id', rewardId)
    .select();

  if (error) {
    throw new Error(error.message || 'Erro ao cancelar recompensa');
  }

  return data[0];
}

/**
 * Deletar uma recompensa
 * @param {string} rewardId - ID da recompensa
 * @returns {boolean} Sucesso
 */
export async function deleteReward(rewardId) {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId);

  if (error) {
    throw new Error(error.message || 'Erro ao deletar recompensa');
  }

  return true;
}

/**
 * Criar uma reivindicação de recompensa
 * @param {string} rewardId - ID da recompensa
 * @param {Object} claimData - Dados da reivindicação
 * @returns {Object} Reivindicação criada
 */
export async function createRewardClaim(rewardId, claimData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { message = '', evidenceNotes = '' } = claimData;

  const claimPayload = {
    reward_id: rewardId,
    claimer_id: user.id,
    message,
    evidence_notes: evidenceNotes,
    status: 'pending',
  };

  console.log('[createRewardClaim] Criando reivindicação:', claimPayload);

  const { data, error } = await supabase
    .from('reward_claims')
    .insert([claimPayload])
    .select();

  if (error) {
    console.error('[createRewardClaim] Erro:', error);
    throw new Error(error.message || 'Erro ao criar reivindicação');
  }

  console.log('[createRewardClaim] Reivindicação criada:', data[0]);
  return data[0];
}

/**
 * Obter reivindicações de uma recompensa
 * @param {string} rewardId - ID da recompensa
 * @returns {Array} Lista de reivindicações
 */
export async function getRewardClaimsForReward(rewardId) {
  const { data, error } = await supabase
    .from('reward_claims')
    .select(`
      *,
      claimer:claimer_id (
        id,
        email,
        profiles:profiles!inner (
          name,
          phone
        )
      )
    `)
    .eq('reward_id', rewardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getRewardClaimsForReward] Erro:', error);
    throw new Error(error.message || 'Erro ao buscar reivindicações');
  }

  return data || [];
}

/**
 * Obter reivindicações do usuário
 * @returns {Array} Lista de reivindicações
 */
export async function getUserClaims() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('reward_claims')
    .select(`
      *,
      reward:reward_id (
        id,
        amount,
        currency,
        description,
        item:item_id (
          id,
          title,
          category
        )
      )
    `)
    .eq('claimer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUserClaims] Erro:', error);
    throw new Error(error.message || 'Erro ao buscar reivindicações');
  }

  return data || [];
}

/**
 * Aprovar uma reivindicação de recompensa
 * @param {string} claimId - ID da reivindicação
 * @returns {Object} Reivindicação aprovada
 */
export async function approveRewardClaim(claimId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Atualizar a reivindicação
  const { data: claim, error: claimError } = await supabase
    .from('reward_claims')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', claimId)
    .select()
    .single();

  if (claimError) {
    throw new Error(claimError.message || 'Erro ao aprovar reivindicação');
  }

  // Atualizar a recompensa para 'claimed'
  const { error: rewardError } = await supabase
    .from('rewards')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
      claimed_by: claim.claimer_id,
    })
    .eq('id', claim.reward_id);

  if (rewardError) {
    throw new Error(rewardError.message || 'Erro ao atualizar recompensa');
  }

  return claim;
}

/**
 * Rejeitar uma reivindicação de recompensa
 * @param {string} claimId - ID da reivindicação
 * @returns {Object} Reivindicação rejeitada
 */
export async function rejectRewardClaim(claimId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('reward_claims')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', claimId)
    .select();

  if (error) {
    throw new Error(error.message || 'Erro ao rejeitar reivindicação');
  }

  return data[0];
}

/**
 * Deletar uma reivindicação
 * @param {string} claimId - ID da reivindicação
 * @returns {boolean} Sucesso
 */
export async function deleteRewardClaim(claimId) {
  const { error } = await supabase
    .from('reward_claims')
    .delete()
    .eq('id', claimId);

  if (error) {
    throw new Error(error.message || 'Erro ao deletar reivindicação');
  }

  return true;
}
