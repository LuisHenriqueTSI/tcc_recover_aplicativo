import { useState, useEffect } from 'react';
import SimpleSidebar from '../components/SimpleSidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [publishedItems, setPublishedItems] = useState([]);
  const [resolvedItems, setResolvedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published');
  const [photosMap, setPhotosMap] = useState({});

  useEffect(() => {
    if (user) {
      fetchUserItems();
    }
  }, [user]);

  useEffect(() => {
    // Recarregar itens toda vez que a página é visitada
    return () => {
      // Cleanup
    };
  }, []);

  async function fetchUserItems() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.error('[Profile] Usuário não autenticado');
        setLoading(false);
        return;
      }

      const { data: userItems, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', authUser.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[Profile] Erro ao buscar itens:', error);
      } else {
        // Separar em publicados (ativos) e resolvidos
        const published = userItems.filter(item => !item.resolved);
        const resolved = userItems.filter(item => item.resolved);
        
        setPublishedItems(published);
        setResolvedItems(resolved);
        fetchPhotosForItems(userItems);
      }
    } catch (error) {
      console.error('[Profile] Erro ao buscar itens:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPhotosForItems(items) {
    if (!items || items.length === 0) {
      setPhotosMap({});
      return;
    }
    try {
      const entries = await Promise.all(items.map(async (it) => {
        try {
          const { data, error } = await supabase
            .from('item_photos')
            .select('url')
            .eq('item_id', it.id)
            .limit(1);
          
          if (error || !data || data.length === 0) return [it.id, null];
          return [it.id, data[0].url];
        } catch {
          return [it.id, null];
        }
      }));
      setPhotosMap(Object.fromEntries(entries));
    } catch {
      setPhotosMap({});
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-dark rounded-xl p-6 text-center border border-white/10">
          <div className="text-red-400 font-bold mb-2">Usuário não autenticado</div>
        </div>
      </div>
    );
  }

  // Função para abrir redes sociais
  const openSocialMedia = (type, value) => {
    let url = '';
    if (!value) return;

    switch(type) {
      case 'instagram':
        url = `https://instagram.com/${value.replace('@', '')}`;
        break;
      case 'twitter':
        url = `https://twitter.com/${value.replace('@', '')}`;
        break;
      case 'facebook':
        url = `https://facebook.com/${value}`;
        break;
      case 'linkedin':
        url = `https://linkedin.com/in/${value}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/${value}`;
        break;
      case 'phone':
        url = `tel:${value}`;
        break;
      default:
        return;
    }
    
    window.open(url, '_blank');
  };

  const itemsForTab = activeTab === 'published' ? publishedItems : resolvedItems;
  const itemsCount = itemsForTab.length;

  const renderItemCard = (item) => {
    const photoUrl = photosMap[item.id];
    return (
      <div
        key={item.id}
        onClick={() => navigate(`/item/${item.id}`)}
        className="flex flex-col gap-2 pb-2 cursor-pointer"
      >
        <div
          className="w-full bg-center bg-no-repeat aspect-[5/6] bg-cover rounded-lg border border-white/5"
          style={{ backgroundImage: photoUrl ? `url(${photoUrl})` : 'linear-gradient(135deg, #1f2937, #111827)' }}
        />
        <div>
          <p className="text-white text-sm font-semibold leading-normal truncate">{item.title}</p>
          <p className="text-text-secondary-dark text-xs leading-normal">Perdido</p>
          <p className="text-text-secondary-dark text-xs leading-normal">Status: {item.resolved ? 'Resolvido' : 'Ativo'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="px-4 sm:px-8 md:px-16 lg:px-24 py-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            {/* Header do perfil */}
            <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col items-center gap-6 text-center">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-2 border-primary" style={{ backgroundImage: user?.avatar_url ? `url(${user.avatar_url})` : `url("https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=3B82F6&color=fff&size=128")` }} />
              <div className="flex flex-col items-center gap-1">
                <p className="text-white text-[22px] font-bold leading-tight tracking-tight">{user.name}</p>
                <p className="text-text-secondary-dark text-base">Membro</p>
                <div className="flex items-center gap-4 text-text-secondary-dark mt-1 flex-wrap justify-center">
                  <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => openSocialMedia('phone', user.phone || '+5511999998888')}>
                    <span className="material-symbols-outlined text-base">call</span>
                    <span className="text-sm">{user.phone || '+55 11 99999-8888'}</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => openSocialMedia('whatsapp', user.whatsapp || user.phone || '+5511999998888')}>
                    <span className="material-symbols-outlined text-base">sms</span>
                    <span className="text-sm">WhatsApp</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile/edit')}
                className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors"
              >
                Editar Perfil
              </button>
            </div>

            {/* Ações sociais */}
            <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-4">
              <div className="grid grid-cols-[repeat(auto-fit,_minmax(80px,_1fr))] gap-4">
                <button
                  onClick={() => openSocialMedia('instagram', user.instagram || 'recover')}
                  className="flex flex-col items-center gap-2 bg-transparent py-2.5 text-center group"
                >
                  <div className="rounded-full bg-white/5 group-hover:bg-primary/20 p-3.5 transition-colors">
                    <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors text-xl">link</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-normal group-hover:text-primary transition-colors">Website</p>
                </button>

                <button
                  onClick={() => openSocialMedia('twitter', user.twitter || 'recover')}
                  className="flex flex-col items-center gap-2 bg-transparent py-2.5 text-center group"
                >
                  <div className="rounded-full bg-white/5 group-hover:bg-primary/20 p-3.5 transition-colors">
                    <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors text-xl">alternate_email</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-normal group-hover:text-primary transition-colors">Twitter</p>
                </button>

                <button
                  onClick={() => openSocialMedia('instagram', user.instagram || 'recover')}
                  className="flex flex-col items-center gap-2 bg-transparent py-2.5 text-center group"
                >
                  <div className="rounded-full bg-white/5 group-hover:bg-primary/20 p-3.5 transition-colors">
                    <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors text-xl">photo_camera</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-normal group-hover:text-primary transition-colors">Instagram</p>
                </button>

                <button
                  onClick={() => openSocialMedia('linkedin', user.linkedin || 'recover')}
                  className="flex flex-col items-center gap-2 bg-transparent py-2.5 text-center group"
                >
                  <div className="rounded-full bg-white/5 group-hover:bg-primary/20 p-3.5 transition-colors">
                    <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors text-xl">work</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-normal group-hover:text-primary transition-colors">LinkedIn</p>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-surface-dark/80 border border-white/10 rounded-2xl">
              <div className="flex border-b border-white/10 px-4 gap-8">
                <button
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-colors ${activeTab === 'published' ? 'border-b-primary text-primary font-bold' : 'border-b-transparent text-text-secondary-dark hover:text-primary hover:border-primary/50'}`}
                  onClick={() => setActiveTab('published')}
                >
                  <p className="text-sm font-bold leading-normal tracking-tight">Itens Publicados</p>
                </button>
                <button
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-colors ${activeTab === 'resolved' ? 'border-b-primary text-primary font-bold' : 'border-b-transparent text-text-secondary-dark hover:text-primary hover:border-primary/50'}`}
                  onClick={() => setActiveTab('resolved')}
                >
                  <p className="text-sm font-bold leading-normal tracking-tight">Itens Resolvidos</p>
                </button>
              </div>

              <div className="p-4">
                {loading ? (
                  <p className="text-sm text-text-secondary-dark text-center py-8">Carregando...</p>
                ) : itemsCount === 0 ? (
                  <p className="text-sm text-text-secondary-dark text-center py-8">Nenhum item encontrado</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                    {itemsForTab.map(renderItemCard)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}