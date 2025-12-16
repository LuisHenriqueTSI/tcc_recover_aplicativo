import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import ChatBadge from './ChatBadge';
import NotificationBell from './NotificationBell';

export default function Header({ showSearch = true, searchValue = '', onSearchChange }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/welcome');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between whitespace-nowrap border-b border-solid border-white/10 bg-background-dark/80 px-10 py-3 backdrop-blur-md">
      {/* Logo */}
      <div 
        onClick={() => navigate('/')}
        className="flex flex-shrink-0 items-center gap-3 text-white cursor-pointer hover:opacity-80 transition"
      >
        <div className="size-8 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor"></path>
          </svg>
        </div>
        <h2 className="text-white text-2xl font-bold tracking-tighter">RECOVER</h2>
      </div>

      {/* Search bar centralizado */}
      {showSearch && (
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg">
          <label className="flex flex-col w-full">
            <div className="relative flex w-full flex-1 items-stretch">
              <div className="text-text-secondary-dark absolute inset-y-0 left-0 flex items-center justify-center pl-4">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                value={searchValue}
                onChange={e => onSearchChange?.(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-12 placeholder:text-text-secondary-dark pl-12 pr-4 text-sm font-normal leading-normal"
                placeholder="Buscar por notebook, chaves, carteira..."
              />
            </div>
          </label>
        </div>
      )}

      {/* Ícones direita */}
      <div className="flex flex-shrink-0 items-center justify-end gap-3">
        <button 
          onClick={() => navigate(user ? '/register-item' : '/login')}
          className="flex h-12 px-6 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold"
          title="Publicar Item"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          <span className="hidden md:inline">Publicar Item</span>
        </button>
        <ChatBadge />
        
        {/* Notification Bell Component */}
        {user && <NotificationBell />}

        {/* Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => user ? setProfileMenuOpen(!profileMenuOpen) : navigate('/login')}
            className="ml-2 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-11 ring-2 ring-primary/50 cursor-pointer hover:ring-primary transition-all"
            title={user ? 'Perfil' : 'Entrar'}
            style={{ backgroundImage: user?.avatar ? `url("${user.avatar}")` : 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJ5Nfrwll3vgByg29e4RlsXLLlhYSq0zyIePQoXalVVdP1_bUmaTL0BpIZOV1jeSGZLS82JPVqVmW0y_2yUHYHwoUYrMdskJho2tnIQm7udpg01LUtUg7_ZF8rnxjz-CtcbqYsQUYIjtHxf1zlyaiGK_T4UYzi_grQvw1y_wSKnOaU_MNONOZ6dmpMie11MpP2dUAGnOotTAMC-LOCoRFJzQKzn0-es9puz6wYdlQZTaz9EWNODWWJKRtoz3bWsuSnm1aAAtlS1R2i")' }} 
          />

          {/* Dropdown Menu */}
          {profileMenuOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-dark border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white truncate">{user.name || 'Usuário'}</p>
                <p className="text-xs text-text-secondary-dark truncate">{user.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
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
                    navigate('/profile/edit');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                  <span>Editar Perfil</span>
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
              </div>

              {/* Logout */}
              <div className="border-t border-white/10 py-1">
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
      </div>
    </header>
  );
}
