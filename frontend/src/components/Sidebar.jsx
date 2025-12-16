import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import RecoverLogo from '../assets/recover-logo.svg';

export default function Sidebar({ 
  statusFilter, 
  onStatusChange, 
  categoryFilter, 
  onCategoryChange, 
  showMyItems, 
  onMyItemsChange,
  searchValue = '',
  onSearchChange,
  onCollapseChange
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/welcome');
  };

  const toggleCollapse = (collapsed) => {
    setIsCollapsed(collapsed);
    if (onCollapseChange) {
      onCollapseChange(collapsed);
    }
  };

  if (isCollapsed) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-background-dark border-r border-white/10 flex flex-col items-center py-4 z-50">
        <button
          onClick={() => toggleCollapse(false)}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-white hover:bg-surface-dark transition-colors"
          title="Expandir menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-80 border-r border-white/10 bg-background-dark flex flex-col overflow-y-auto z-50">
      {/* Header Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-6">
          {/* Logo */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-white cursor-pointer hover:opacity-80 transition"
          >
            <div className="size-10 text-primary">
              <img src={RecoverLogo} alt="Logo Recover" className="h-10 w-10" />
            </div>
            <h2 className="text-white text-xl font-bold tracking-tighter">RECOVER</h2>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => toggleCollapse(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary-dark hover:bg-surface-dark hover:text-white transition-colors"
            title="Esconder menu"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <label className="flex flex-col w-full">
            <div className="relative flex w-full flex-1 items-stretch">
              <div className="text-text-secondary-dark absolute inset-y-0 left-0 flex items-center justify-center pl-4">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                value={searchValue}
                onChange={e => onSearchChange?.(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark pl-11 pr-4 text-sm font-normal leading-normal"
                placeholder="Buscar itens..."
              />
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => navigate(user ? '/register-item' : '/login')}
            className="flex-1 flex h-10 px-4 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold text-sm"
            title="Publicar Item"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Publicar</span>
          </button>
          <button 
            onClick={() => navigate(user ? '/chat' : '/login')}
            className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-surface-dark text-text-secondary-dark hover:bg-white/10 hover:text-white transition-all"
            title="Chat"
          >
            <span className="material-symbols-outlined text-xl">chat_bubble</span>
          </button>
          
          {/* Notification Bell */}
          {user && <NotificationBell />}
        </div>

        {/* Profile Section */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-dark transition-colors"
            >
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary/50"
                style={{ 
                  backgroundImage: user?.avatar_url 
                    ? `url("${user.avatar_url}")` 
                    : 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJ5Nfrwll3vgByg29e4RlsXLLlhYSq0zyIePQoXalVVdP1_bUmaTL0BpIZOV1jeSGZLS82JPVqVmW0y_2yUHYHwoUYrMdskJho2tnIQm7udpg01LUtUg7_ZF8rnxjz-CtcbqYsQUYIjtHxf1zlyaiGK_T4UYzi_grQvw1y_wSKnOaU_MNONOZ6dmpMie11MpP2dUAGnOotTAMC-LOCoRFJzQKzn0-es9puz6wYdlQZTaz9EWNODWWJKRtoz3bWsuSnm1aAAtlS1R2i")' 
                }} 
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white truncate">{user.name || 'Usuário'}</p>
                <p className="text-xs text-text-secondary-dark truncate">{user.email}</p>
              </div>
              <span className="material-symbols-outlined text-text-secondary-dark text-lg">
                {profileMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="mt-2 bg-surface-dark border border-white/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">person</span>
                  <span>Ver Perfil</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/chat');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">chat</span>
                  <span>Mensagens</span>
                </button>

                <div className="border-t border-white/10">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex h-10 px-4 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary text-white hover:bg-primary/90 transition-all font-semibold text-sm"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            <span>Entrar</span>
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="flex-1 px-6 py-6 space-y-6">
        <div className="text-text-secondary-dark text-xs font-semibold uppercase tracking-wider mb-4">Filtros</div>

        {/* Status Filter */}
        <div>
          <label className="text-text-secondary-dark text-sm font-semibold mb-3 block">Status</label>
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-10 px-4 text-sm"
          >
            <option value="all">Todos</option>
            <option value="lost">Perdido</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-text-secondary-dark text-sm font-semibold mb-3 block">Categoria</label>
          <select
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value)}
            className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-10 px-4 text-sm"
          >
            <option value="all">Todas</option>
            <option value="animal">Animal</option>
            <option value="document">Documento</option>
            <option value="object">Objeto</option>
            <option value="electronics">Eletrônico</option>
            <option value="jewelry">Joia/Acessório</option>
            <option value="clothing">Roupa</option>
          </select>
        </div>

        {/* My Items Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-surface-dark/50 p-3 rounded-lg transition">
          <input
            type="checkbox"
            checked={showMyItems}
            onChange={e => onMyItemsChange(e.target.checked)}
            className="w-5 h-5 rounded border-white/10 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
          />
          <span className="text-white font-medium">Meus itens</span>
        </label>
      </div>
    </aside>
  );
}

