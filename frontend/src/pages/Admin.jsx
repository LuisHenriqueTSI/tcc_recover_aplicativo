import { useState } from 'react';
import SimpleSidebar from '../components/SimpleSidebar';

export default function Admin() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-4xl mx-auto text-center bg-surface-dark rounded-xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Painel Administrativo</h2>
          <div className="mb-6 text-text-secondary-dark">Gerencie usuários, itens, denúncias e veja estatísticas do sistema.</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-dark/60 border border-white/10 rounded-lg p-6 text-text-primary-dark font-semibold hover:bg-surface-dark/80 transition cursor-pointer">👥 Usuários</div>
            <div className="bg-surface-dark/60 border border-white/10 rounded-lg p-6 text-text-primary-dark font-semibold hover:bg-surface-dark/80 transition cursor-pointer">📦 Itens</div>
            <div className="bg-surface-dark/60 border border-white/10 rounded-lg p-6 text-text-primary-dark font-semibold hover:bg-surface-dark/80 transition cursor-pointer">⚠️ Denúncias</div>
            <div className="bg-surface-dark/60 border border-white/10 rounded-lg p-6 text-text-primary-dark font-semibold hover:bg-surface-dark/80 transition cursor-pointer">📊 Estatísticas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
