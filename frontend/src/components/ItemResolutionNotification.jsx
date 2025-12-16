import { useState, useEffect } from 'react';
import { getPendingNotificationItems, markItemAsResolved } from '../services/statistics';
import Button from './Button';

export default function ItemResolutionNotification() {
  const [pendingItems, setPendingItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPendingItems();
    // Verifica a cada 30 segundos
    const interval = setInterval(checkPendingItems, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkPendingItems() {
    console.log('[ItemResolutionNotification] Checking for pending items...');
    const { data, error } = await getPendingNotificationItems();
    
    if (error) {
      console.error('[ItemResolutionNotification] Error fetching pending items:', error);
      return;
    }
    
    console.log('[ItemResolutionNotification] Pending items received:', data);
    
    if (data && Array.isArray(data)) {
      // Filtrar itens que já foram dispensados nesta sessão
      const filtered = data.filter(item => !dismissedItems.includes(item.id));
      console.log('[ItemResolutionNotification] Filtered items:', filtered);
      setPendingItems(filtered);
    }
  }

  async function handleYes(item) {
    setLoading(true);
    const { data, error } = await markItemAsResolved(item.id);
    
    if (error) {
      alert(error.message || 'Erro ao marcar item como resolvido');
    } else {
      // Remove o item da lista de pendentes
      setPendingItems(prev => prev.filter(i => i.id !== item.id));
      // Mostra mensagem de sucesso
      alert('🎉 Parabéns! Ótimo saber que encontrou seu item!');
    }
    setLoading(false);
  }

  function handleNo(item) {
    // Remove da lista e adiciona aos dispensados
    setPendingItems(prev => prev.filter(i => i.id !== item.id));
    setDismissedItems(prev => [...prev, item.id]);
  }

  if (pendingItems.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {pendingItems.map(item => (
        <div
          key={item.id}
          className="bg-white border-2 border-primary shadow-lg rounded-lg p-4 mb-3 animate-slide-up"
        >
          <div className="flex items-start gap-2 mb-3">
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <h3 className="font-bold text-primary mb-1">Você encontrou seu item?</h3>
              <p className="text-sm text-neutral-dark">
                <span className="font-semibold">{item.title}</span>
                {item.location && <span className="text-xs block text-gray-500">📍 {item.location}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => handleYes(item)}
              disabled={loading}
              className="flex-1 text-sm py-2"
            >
              {loading ? 'Salvando...' : 'Sim! 🎉'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleNo(item)}
              disabled={loading}
              className="flex-1 text-sm py-2"
            >
              Ainda não
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
