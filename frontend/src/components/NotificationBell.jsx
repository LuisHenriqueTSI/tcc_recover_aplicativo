import { useState, useEffect } from 'react';
import { getPendingNotificationItems, markItemAsResolved } from '../services/statistics';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

export default function NotificationBell() {
  const [pendingItems, setPendingItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { unreadCount } = useUnreadMessages();

  useEffect(() => {
    checkPendingItems();
    // Verifica a cada 30 segundos
    const interval = setInterval(checkPendingItems, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkPendingItems() {
    console.log('[NotificationBell] Checking for pending items...');
    const { data, error } = await getPendingNotificationItems();
    
    if (error) {
      console.error('[NotificationBell] Error fetching pending items:', error);
      return;
    }
    
    console.log('[NotificationBell] Pending items received:', data);
    
    if (data && Array.isArray(data)) {
      // Filtrar itens que já foram dispensados nesta sessão
      const filtered = data.filter(item => !dismissedItems.includes(item.id));
      console.log('[NotificationBell] Filtered items:', filtered);
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
      alert('🎉 Parabéns! Ótimo saber que encontrou seu item!');
      // Fecha o dropdown se não houver mais itens
      if (pendingItems.length === 1) {
        setIsOpen(false);
      }
    }
    setLoading(false);
  }

  function handleNo(item) {
    // Remove da lista e adiciona aos dispensados
    setPendingItems(prev => prev.filter(i => i.id !== item.id));
    setDismissedItems(prev => [...prev, item.id]);
    // Fecha o dropdown se não houver mais itens
    if (pendingItems.length === 1) {
      setIsOpen(false);
    }
  }

  const notificationCount = pendingItems.length + unreadCount;

  return (
    <div className="relative">
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-surface-dark text-text-secondary-dark hover:bg-white/10 hover:text-white transition-all relative"
        aria-label="Notificações"
        title="Notificações"
      >
        <span className="material-symbols-outlined text-xl">notifications</span>
        
        {/* Badge com contador */}
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-background-dark">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-72 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
            <div className="px-3 py-2.5 border-b border-white/10">
              <h3 className="font-semibold text-base text-primary">
                Notificações {notificationCount > 0 && `(${notificationCount})`}
              </h3>
            </div>

            {notificationCount === 0 ? (
              <div className="p-4 text-center text-text-secondary-dark">
                <div className="text-3xl mb-1">🔔</div>
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {/* Mensagens não lidas */}
                {unreadCount > 0 && (
                  <div className="p-3 bg-primary/20 hover:bg-primary/30 cursor-pointer transition-colors" onClick={() => { window.location.href = '/chat'; setIsOpen(false); }}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">💬</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary text-sm mb-0.5">
                          {unreadCount === 1 ? 'Nova mensagem' : `${unreadCount} novas mensagens`}
                        </h4>
                        <p className="text-xs text-text-secondary-dark">
                          Clique para ver suas mensagens
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Itens pendentes de resolução */}
                {pendingItems.map(item => (
                  <div key={item.id} className="p-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl">🔍</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary text-sm mb-0.5">
                          Você encontrou seu item?
                        </h4>
                        <p className="text-xs text-text-primary-dark">
                          <span className="font-medium">{item.title}</span>
                          {item.location && (
                            <span className="text-xs block text-text-secondary-dark mt-0.5">
                              📍 {item.location}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleYes(item)}
                        disabled={loading}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Salvando...' : 'Sim! 🎉'}
                      </button>
                      <button
                        onClick={() => handleNo(item)}
                        disabled={loading}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-text-primary-dark font-medium py-1.5 px-3 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        Ainda não
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
