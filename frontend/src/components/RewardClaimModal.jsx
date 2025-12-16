import { useState } from 'react';
import { createRewardClaim } from '../services/rewards';
import Button from './Button';

export default function RewardClaimModal({ isOpen, reward, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmitClaim(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!message.trim()) {
        throw new Error('Explique como você encontrou o item');
      }

      await createRewardClaim(reward.id, {
        message: message.trim(),
        evidenceNotes: evidenceNotes.trim(),
      });

      setMessage('');
      setEvidenceNotes('');
      setError('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao reclamar recompensa');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !reward) return null;

  const formattedAmount = reward.amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: reward.currency || 'BRL',
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Reclamar Recompensa
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary-dark hover:text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⭐</span>
            <p className="text-yellow-400 font-semibold">Recompensa disponível</p>
          </div>
          <p className="text-2xl font-bold text-yellow-300">{formattedAmount}</p>
          {reward.description && (
            <p className="text-yellow-200/80 text-sm mt-2">{reward.description}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitClaim} className="space-y-4">
          <div>
            <label className="block text-white font-semibold mb-2">
              Como você encontrou o item? *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva onde e como você encontrou este item..."
              rows="4"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition resize-none"
              required
            />
            <p className="text-text-secondary-dark text-sm mt-1">
              Forneça detalhes sobre onde e como encontrou o item
            </p>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">
              Evidências (opcional)
            </label>
            <textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Descreva qualquer evidência que prove que encontrou o item (características especiais, fotos, etc)..."
              rows="3"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition resize-none"
            />
            <p className="text-text-secondary-dark text-sm mt-1">
              Compartilhe detalhes que comprovem que você encontrou o item
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-200 text-sm">
              <strong>Importante:</strong> Sua reclamação será enviada ao proprietário do item. 
              Ele analisará suas informações e aprovará ou rejeitará sua reclamação.
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
              {loading ? 'Enviando...' : 'Reclamar Recompensa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
