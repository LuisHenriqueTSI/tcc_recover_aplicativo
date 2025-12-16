import { useEffect, useState } from 'react';
import { getRewardByItemId } from '../services/rewards';

export default function RewardBadge({ itemId, onClick }) {
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchReward() {
      try {
        setLoading(true);
        const rewardData = await getRewardByItemId(itemId);
        setReward(rewardData);
      } catch (error) {
        console.error('[RewardBadge] Erro ao buscar recompensa:', error);
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      fetchReward();
    }
  }, [itemId]);

  if (loading || !reward) {
    return null;
  }

  const formattedAmount = reward.amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: reward.currency || 'BRL',
  });

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-300 font-semibold text-sm transition-all"
      title="Item com recompensa"
    >
      <span className="text-lg">⭐</span>
      <span>Recompensa: {formattedAmount}</span>
    </button>
  );
}
