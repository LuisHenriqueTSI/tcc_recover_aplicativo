import { useState } from 'react';
import SimpleSidebar from '../components/SimpleSidebar';

export default function Map() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-4xl mx-auto text-center bg-surface-dark rounded-xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">🗺️ Mapa Interativo</h2>
          <div className="bg-surface-dark/60 border border-white/10 rounded-lg h-96 flex items-center justify-center">
            <span className="text-text-secondary-dark">[Mapa com marcadores de itens]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
