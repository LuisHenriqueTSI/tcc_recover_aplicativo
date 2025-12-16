import { useState } from 'react';
import { createReward, cancelReward, getRewardByItemId } from '../services/rewards';
import Button from './Button';

export default function RewardModal({ isOpen, itemId, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [daysToExpire, setDaysToExpire] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingReward, setExistingReward] = useState(null);

  // Carregar recompensa existente ao abrir modal
  useState(() => {
    if (isOpen && itemId) {
      fetchExistingReward();
    }
  });

  async function fetchExistingReward() {
    try {
      const reward = await getRewardByItemId(itemId);
      setExistingReward(reward);
    } catch (error) {
      console.error('[RewardModal] Erro ao buscar recompensa:', error);
    }
  }

  async function handleCreateReward(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Informe um valor válido para a recompensa');
      }

      const expiresAt = daysToExpire
        ? new Date(Date.now() + parseInt(daysToExpire) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const rewardData = {
        amount: parseFloat(amount),
        description,
        expiresAt,
      };

      await createReward(itemId, rewardData);

      setAmount('');
      setDescription('');
      setDaysToExpire('30');
      setError('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao criar recompensa');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelReward() {
    if (!existingReward) return;

    if (!confirm('Tem certeza que deseja cancelar esta recompensa?')) {
      return;
    }

    setLoading(true);
    try {
      await cancelReward(existingReward.id);
      setExistingReward(null);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao cancelar recompensa');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {existingReward ? 'Gerenciar Recompensa' : 'Oferecer Recompensa'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary-dark hover:text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {existingReward ? (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-text-secondary-dark text-sm mb-2">Valor da Recompensa</p>
              <p className="text-2xl font-bold text-yellow-400">
                {existingReward.amount.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: existingReward.currency || 'BRL',
                })}
              </p>
              {existingReward.description && (
                <>
                  <p className="text-text-secondary-dark text-sm mt-3 mb-1">Descrição</p>
                  <p className="text-white text-sm">{existingReward.description}</p>
                </>
              )}
              {existingReward.expires_at && (
                <>
                  <p className="text-text-secondary-dark text-sm mt-3 mb-1">Expira em</p>
                  <p className="text-white text-sm">
                    {new Date(existingReward.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button
                variant="primary"
                onClick={onClose}
                className="flex-1"
              >
                Fechar
              </Button>
              <button
                onClick={handleCancelReward}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cancelando...' : 'Cancelar Recompensa'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateReward} className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">
                Valor da Recompensa (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 100.00"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition"
                required
              />
              <p className="text-text-secondary-dark text-sm mt-1">
                Digite o valor em reais que você oferece como recompensa
              </p>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Recompensa por encontrar meu documento..."
                rows="3"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Tempo para Expiração (dias)
              </label>
              <select
                value={daysToExpire}
                onChange={(e) => setDaysToExpire(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition"
              >
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
                <option value="">Sem expiração</option>
              </select>
              <p className="text-text-secondary-dark text-sm mt-1">
                A recompensa será marcada como expirada após este período
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-white font-semibold transition"
              >
                Cancelar
              </button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Criando...' : 'Oferecer Recompensa'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
