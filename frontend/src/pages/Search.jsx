import { useState } from 'react';
import SimpleSidebar from '../components/SimpleSidebar';

export default function Search() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-4xl mx-auto bg-surface-dark rounded-xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">🔍 Buscar Itens</h2>
        <form className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Categoria</label>
            <input className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal" placeholder="Selecione uma categoria" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Localização</label>
            <input className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal" placeholder="Digite a localização" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Data</label>
            <input type="date" className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal" />
          </div>
          <button type="submit" className="w-full px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors mt-2">🔍 Buscar</button>
        </form>
        <div className="mt-4 text-text-secondary-dark text-center py-8">Nenhum resultado encontrado.</div>
        </div>
      </div>
    </div>
  );
}
