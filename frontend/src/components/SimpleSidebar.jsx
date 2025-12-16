import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RecoverLogo from '../assets/recover-logo.svg';
import ChatBadge from './ChatBadge';
import NotificationBell from './NotificationBell';

export default function SimpleSidebar({ onCollapseChange }) {
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
          <ChatBadge />
          
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
                    : `url("https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=3B82F6&color=fff&size=40")` 
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
                    navigate('/home');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">inventory_2</span>
                  <span>Meus Itens</span>
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
    </aside>
  );
}
