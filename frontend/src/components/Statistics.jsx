import { useState, useEffect } from 'react';
import { getResolvedStatistics } from '../services/statistics';

export default function Statistics() {
  const [stats, setStats] = useState({ total_resolved: 0, by_category: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    // Atualiza as estatísticas a cada 30 segundos
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatistics() {
    const { data, error } = await getResolvedStatistics();
    if (data) {
      setStats(data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-center text-neutral-dark">
        <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary inline-block"></span>
      </div>
    );
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'Pets': '🐾',
      'Documentos': '📄',
      'Eletrônicos': '📱',
      'Chaves': '🔑',
      'Carteiras': '💳',
      'Bolsas': '👜',
      'Roupas': '👕',
      'Joias': '💍',
      'Outros': '📦'
    };
    return icons[category] || '📦';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
      <h3 className="text-xl font-heading font-bold text-primary mb-4 text-center">
        🎉 Itens Reunidos com Seus Donos
      </h3>
      
      <div className="text-center mb-6">
        <div className="text-5xl font-bold text-secondary">
          {stats.total_resolved}
        </div>
        <div className="text-sm text-neutral-dark mt-2">
          {stats.total_resolved === 1 ? 'item devolvido' : 'itens devolvidos'}
        </div>
      </div>

      {stats.by_category.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-neutral-dark mb-2">Por categoria:</h4>
          {stats.by_category.map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between bg-neutral-light p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                <span className="text-neutral-dark font-medium">{item.category}</span>
              </div>
              <span className="text-lg font-bold text-secondary">{item.count}</span>
            </div>
          ))}
        </div>
      )}

      {stats.total_resolved === 0 && (
        <p className="text-center text-neutral-dark text-sm">
          Ainda não há itens devolvidos. Seja o primeiro a reunir alguém com seu pertence perdido!
        </p>
      )}
    </div>
  );
}
