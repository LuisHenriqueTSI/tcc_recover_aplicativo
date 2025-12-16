import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getResolvedStatistics } from '../services/statistics';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ total_resolved: 0, by_category: [] });

  useEffect(() => {
    fetchStatistics();
    // Atualiza as estatísticas a cada 30 segundos
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Se já está logado, redireciona para Home
  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  async function fetchStatistics() {
    const { data } = await getResolvedStatistics();
    if (data) {
      setStats(data);
    }
  }

  // Calcula estatísticas derivadas
  const totalItems = stats.total_resolved || 0;
  const animalsReunited = stats.by_category?.find(cat => 
    cat.category === 'Pets' || cat.category === 'Animal'
  )?.count || 0;
  const peopleConnected = Math.floor(totalItems * 2.5); // Estimativa de pessoas envolvidas

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark text-text-primary-dark antialiased">
      {/* Header simplificado para Welcome */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between whitespace-nowrap border-b border-solid border-white/10 bg-background-dark/80 px-10 py-3 backdrop-blur-md">
        {/* Logo */}
        <div 
          onClick={() => navigate('/welcome')}
          className="flex flex-shrink-0 items-center gap-3 text-white cursor-pointer hover:opacity-80 transition"
        >
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tighter">RECOVER</h2>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3">
          <button 
            onClick={() => navigate('/home')}
            className="flex h-10 px-4 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg text-white hover:bg-white/10 transition-all font-medium text-sm"
          >
            <span className="material-symbols-outlined text-xl">search</span>
            <span className="hidden md:inline">Ver Itens</span>
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="flex h-10 px-4 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all font-semibold text-sm"
          >
            Entrar
          </button>
          
          <button 
            onClick={() => navigate('/register')}
            className="flex h-10 px-4 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold text-sm"
          >
            Cadastrar-se
          </button>
        </div>
      </header>
      
      {/* Main Content - Tudo visível sem scroll */}
      <main className="flex h-screen pt-20 flex-col items-center justify-center px-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center gap-8">
          
          {/* Hero Section Compacta */}
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="text-primary" style={{ fontSize: '48px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>travel_explore</span>
            </div>
            <h1 className="text-white text-3xl font-black leading-tight tracking-tighter sm:text-4xl md:text-5xl">
              Ajudamos você a Encontrar o que Perdeu.
            </h1>
            <h2 className="text-white/70 text-sm font-normal leading-relaxed max-w-2xl mx-auto sm:text-base">
              A sua plataforma para reencontrar objetos perdidos. Conectamos pessoas e seus pertences com simplicidade e segurança.
            </h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mt-2">
              <button 
                onClick={() => navigate('/home')}
                className="flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-6 bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-bold"
              >
                Explorar Itens
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-6 bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 transition-colors text-sm font-bold"
              >
                Cadastrar-se
              </button>
            </div>
          </div>

          {/* Statistics Section Compacta */}
          <div className="w-full bg-gray-900/50 rounded-2xl py-6 px-4">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="text-secondary" style={{ fontSize: '32px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>inventory_2</span>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-primary text-2xl sm:text-3xl font-bold tracking-tight">
                    {totalItems > 0 ? `${totalItems.toLocaleString('pt-BR')}+` : '0'}
                  </p>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Itens Recuperados</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-secondary" style={{ fontSize: '32px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>pets</span>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-primary text-2xl sm:text-3xl font-bold tracking-tight">
                    {animalsReunited > 0 ? `${animalsReunited.toLocaleString('pt-BR')}+` : '0'}
                  </p>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Animais Reunidos</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-secondary" style={{ fontSize: '32px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>groups</span>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-primary text-2xl sm:text-3xl font-bold tracking-tight">
                    {peopleConnected > 0 ? `${peopleConnected.toLocaleString('pt-BR')}+` : '0'}
                  </p>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Pessoas Conectadas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
