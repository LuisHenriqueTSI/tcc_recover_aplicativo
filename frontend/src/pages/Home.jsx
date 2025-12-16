import Sidebar from '../components/Sidebar'
import ShareButton from '../components/ShareButton'
import RewardBadge from '../components/RewardBadge'
import RewardClaimModal from '../components/RewardClaimModal'
import SightingModal from '../components/SightingModal'
import SightingsList from '../components/SightingsList'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react';
import { deleteItem } from '../services/items';
import { getRewardByItemId } from '../services/rewards';
import { getSightings, deleteSighting } from '../services/sightings';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photosMap, setPhotosMap] = useState({});
  const [mapOpen, setMapOpen] = useState({});
  const [contactModal, setContactModal] = useState({ open: false, item: null, message: '', sending: false, error: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [ownerSocialMedia, setOwnerSocialMedia] = useState({});
  const [ownerProfiles, setOwnerProfiles] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rewardClaimModal, setRewardClaimModal] = useState({ open: false, reward: null });
  const [sightingModal, setSightingModal] = useState({ open: false, item: null });
  const [sightings, setSightings] = useState([]);
  const [loadingSightings, setLoadingSightings] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        setError('Erro ao carregar itens');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  // Atualiza lista de categorias e itens filtrados quando items mudam
  useEffect(() => {
    if (!items) return;
    // extrair categorias únicas
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
    setCategories(cats);
    // inicializa filteredItems
    setFilteredItems(items);
  }, [items]);

  // Aplica filtros ao conjunto de itens
  useEffect(() => {
    if (!items) return setFilteredItems([]);
    const s = search.trim().toLowerCase();
    const filtered = items.filter(it => {
      // filtro "meus itens"
      if (mineOnly && user && String(it.owner_id) !== String(user.id)) return false;
      // categoria
      if (categoryFilter !== 'all' && (it.category || '') !== categoryFilter) return false;
      // busca por texto em título, descrição e endereço
      if (s) {
        const hay = `${it.title || it.name || ''} ${it.description || ''} ${it.address || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    setFilteredItems(filtered);
  }, [items, search, categoryFilter, mineOnly, user]);

  // Quando os items forem carregados, busque as fotos (primeira foto) para mostrar nos cards
  useEffect(() => {
    if (!items || items.length === 0) return;
    let mounted = true;
    (async () => {
      try {
        console.log('[Home] Buscando fotos para', items.length, 'itens');
        const entries = await Promise.all(items.map(async (it) => {
          try {
            const { data, error } = await supabase
              .from('item_photos')
              .select('url')
              .eq('item_id', it.id)
              .limit(1);
            
            console.log(`[Home] Fotos do item ${it.id}:`, data, error);
            
            if (error) {
              console.error(`[Home] Erro ao buscar fotos do item ${it.id}:`, error);
              return [it.id, null];
            }
            
            if (!data || data.length === 0) {
              console.log(`[Home] Nenhuma foto encontrada para item ${it.id}`);
              return [it.id, null];
            }
            
            console.log(`[Home] Foto encontrada para item ${it.id}:`, data[0].url);
            return [it.id, data[0].url];
          } catch (err) {
            console.error(`[Home] Erro ao buscar foto do item ${it.id}:`, err);
            return [it.id, null];
          }
        }));
        if (!mounted) return;
        const map = Object.fromEntries(entries);
        console.log('[Home] Mapa de fotos final:', map);
        setPhotosMap(map);
      } catch (err) {
        console.error('[Home] Erro geral ao buscar fotos:', err);
      }
    })();
    return () => { mounted = false; };
  }, [items]);

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar item');
    }
  }

  // Buscar redes sociais do proprietário do item
  async function loadOwnerSocialMedia(userId, forceReload = false) {
    if (ownerSocialMedia[userId] && !forceReload) return; // já foi carregado
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('instagram, twitter, whatsapp, facebook, linkedin, phone')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setOwnerSocialMedia(prev => ({ ...prev, [userId]: data }));
      }
    } catch (err) {
      console.debug('Erro ao buscar redes sociais do proprietário:', err);
    }
  }

  // Buscar perfil do proprietário (nome e avatar)
  async function loadOwnerProfile(userId) {
    if (ownerProfiles[userId]) return; // já foi carregado
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.debug('Erro ao buscar perfil:', error.message);
        return;
      }
      
      if (data) {
        setOwnerProfiles(prev => ({ ...prev, [userId]: data }));
      }
    } catch (err) {
      console.debug('Erro ao buscar perfil do proprietário:', err);
    }
  }

  // Carregar perfis dos proprietários dos itens
  useEffect(() => {
    if (!items || items.length === 0) return;
    // Desabilitado temporariamente para evitar erro 406 de RLS
    // items.forEach(item => {
    //   if (item.owner_id) {
    //     loadOwnerProfile(item.owner_id);
    //   }
    // });
  }, [items]);

  // Carregar avistamentos de um item
  async function loadSightings(itemId) {
    setLoadingSightings(true);
    try {
      const result = await getSightings(itemId);
      if (result.success) {
        setSightings(result.data);
      } else {
        console.error('Erro ao carregar avistamentos:', result.error);
      }
    } catch (err) {
      console.error('Erro ao carregar avistamentos:', err);
    } finally {
      setLoadingSightings(false);
    }
  }

  // Deletar um avistamento
  async function handleDeleteSighting(sightingId) {
    if (!confirm('Tem certeza que deseja deletar este avistamento?')) return;

    try {
      const result = await deleteSighting(sightingId);
      if (result.success) {
        setSightings(prev => prev.filter(s => s.id !== sightingId));
        alert('✅ Avistamento deletado com sucesso');
      } else {
        alert('Erro ao deletar avistamento');
      }
    } catch (err) {
      console.error('Erro ao deletar avistamento:', err);
      alert('Erro ao deletar avistamento');
    }
  }

  // Quando um item é selecionado, carregar seus avistamentos
  useEffect(() => {
    if (selectedItem) {
      loadSightings(selectedItem.id);
    }
  }, [selectedItem]);

  async function sendContact() {
    if (!contactModal.item) return;
    if (!contactModal.message || contactModal.message.trim() === '') {
      setContactModal(prev => ({ ...prev, error: 'Digite uma mensagem' }));
      return;
    }
    setContactModal(prev => ({ ...prev, sending: true, error: '' }));
    try {
      const payload = {
        sender_id: user?.id,
        receiver_id: contactModal.item.owner_id,
        item_id: contactModal.item.id,
        content: contactModal.message,
        read: false
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select();
      
      if (error) {
        throw new Error(error.message || 'Erro ao enviar mensagem');
      }
      
      // success
      setContactModal({ open: false, item: null, message: '', sending: false, error: '' });
      alert('Mensagem enviada ao proprietário.');
    } catch (e) {
      setContactModal(prev => ({ ...prev, sending: false, error: e.message || 'Erro ao enviar' }));
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark">
      <Sidebar 
        searchValue={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        showMyItems={mineOnly}
        onMyItemsChange={setMineOnly}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <main className={`flex-1 p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-primary"></div>
              <span className="ml-4 font-semibold text-white">Carregando...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
              <span>{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-text-secondary-dark text-center py-12">Nenhum item corresponde aos filtros.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex flex-col overflow-hidden rounded-xl bg-surface-dark/60 shadow-lg transition-all hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                    {photosMap[item.id] ? (
                      <img className="h-full w-full object-cover" src={photosMap[item.id]} alt={item.title || item.name} />
                    ) : (
                      <div className="h-full w-full bg-surface-dark flex items-center justify-center text-text-secondary-dark">Sem foto</div>
                    )}
                    {/* Botão de compartilhar no canto superior direito */}
                    <div className="absolute top-2 right-2">
                      <ShareButton item={item} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-secondary bg-secondary/20 px-2 py-0.5 rounded-full">
                          {item.category || 'Outros'}
                        </span>
                      </div>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold bg-lost-yellow text-background-dark`}>
                        PERDIDO
                      </span>
                    </div>
                    
                    {/* Reward Badge */}
                    <div className="mb-2">
                      <RewardBadge 
                        itemId={item.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ação ao clicar na recompensa se necessário
                        }}
                      />
                    </div>
                    
                    <h3 className="text-base font-bold text-white mb-1.5">{item.title || item.name}</h3>
                    <p className="text-sm text-text-secondary-dark mb-3 flex-1 line-clamp-2">
                      {item.description && item.description.length > 60
                        ? `${item.description.substring(0, 60)}... `
                        : item.description}
                      {item.description && item.description.length > 60 && (
                        <a className="text-primary font-semibold hover:underline" href="#">Ver mais...</a>
                      )}
                    </p>
                    <button className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 border-2 border-primary text-primary text-xs font-bold tracking-wide hover:bg-primary hover:text-white transition-colors">
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      {/* Modal de detalhes do item */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-screen overflow-y-auto`} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`mb-6 pb-4 border-b-2 ${darkMode ? 'border-gray-700' : 'border-neutral-light'}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-primary'}`}>{selectedItem.title || selectedItem.name}</h2>
                <div className="flex items-center gap-2">
                  <ShareButton item={selectedItem} />
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-2xl hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className={`text-sm font-semibold text-yellow-600`}>
                🔍 Perdido
              </div>
            </div>

            {/* Foto */}
            {photosMap[selectedItem.id] && (
              <div className="mb-4 rounded overflow-hidden">
                <img src={photosMap[selectedItem.id]} alt={selectedItem.title} className="w-full object-cover max-h-96" />
              </div>
            )}

            {/* Conteúdo */}
            <div className="space-y-4 mb-6">
              {/* Perfil do Proprietário */}
              {selectedItem.owner_id && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-4">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <span>👤</span>
                    <span>Proprietário</span>
                  </h3>
                  {ownerProfiles[selectedItem.owner_id] ? (
                    <div className="flex items-center gap-3">
                      {ownerProfiles[selectedItem.owner_id].avatar_url ? (
                        <img 
                          src={ownerProfiles[selectedItem.owner_id].avatar_url} 
                          alt={ownerProfiles[selectedItem.owner_id].name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary">
                          {ownerProfiles[selectedItem.owner_id].name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{ownerProfiles[selectedItem.owner_id].name}</p>
                        <p className="text-xs text-gray-400">Registrou este item</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => loadOwnerProfile(selectedItem.owner_id)}
                      className="text-sm text-primary hover:text-primary/80 transition"
                    >
                      Carregando informações do proprietário...
                    </button>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-neutral-dark mb-1">Descrição</h3>
                <p className="text-neutral-dark whitespace-pre-wrap">{selectedItem.description || 'Sem descrição'}</p>
              </div>

              {selectedItem.address && (
                <div>
                  <h3 className="font-semibold text-neutral-dark mb-1">Endereço</h3>
                  <p className="text-neutral-dark">{selectedItem.address}</p>
                </div>
              )}

              {selectedItem.category && (
                <div>
                  <h3 className="font-semibold text-neutral-dark mb-1">Categoria</h3>
                  <p className="text-neutral-dark">{selectedItem.category}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-neutral-dark mb-1">Data de Registro</h3>
                <p className="text-neutral-dark">{selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString('pt-BR') : 'Não informada'}</p>
              </div>

              {(selectedItem.latitude && selectedItem.longitude) || selectedItem.address ? (
                <div>
                  <button
                    onClick={async () => {
                      const state = mapOpen[selectedItem.id];
                      if (state && state.show) {
                        setMapOpen(prev => ({ ...prev, [selectedItem.id]: { ...prev[selectedItem.id], show: false } }));
                        return;
                      }

                      if (selectedItem.latitude && selectedItem.longitude) {
                        setMapOpen(prev => ({ ...prev, [selectedItem.id]: { show: true, lat: selectedItem.latitude, lon: selectedItem.longitude } }));
                        return;
                      }

                      setMapOpen(prev => ({ ...prev, [selectedItem.id]: { loading: true } }));
                      try {
                        const q = encodeURIComponent(selectedItem.address);
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`);
                        const json = await res.json();
                        if (json && json.length > 0) {
                          const lat = json[0].lat;
                          const lon = json[0].lon;
                          setMapOpen(prev => ({ ...prev, [selectedItem.id]: { show: true, lat, lon } }));
                        }
                      } catch {
                        console.error('Erro ao buscar localização');
                      }
                    }}
                    className="text-primary hover:underline font-semibold"
                  >
                    {mapOpen[selectedItem.id] && mapOpen[selectedItem.id].show ? 'Ocultar Mapa' : 'Visualizar no Mapa'}
                  </button>

                  {mapOpen[selectedItem.id] && mapOpen[selectedItem.id].show && (mapOpen[selectedItem.id].lat || mapOpen[selectedItem.id].lon) && (
                    <div className="mt-3">
                      <div className="w-full h-64 rounded overflow-hidden border">
                        <iframe
                          title={`map-detail-${selectedItem.id}`}
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(mapOpen[selectedItem.id].lon) - 0.01},${Number(mapOpen[selectedItem.id].lat) - 0.01},${Number(mapOpen[selectedItem.id].lon) + 0.01},${Number(mapOpen[selectedItem.id].lat) + 0.01}&layer=mapnik&marker=${mapOpen[selectedItem.id].lat},${mapOpen[selectedItem.id].lon}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Avistamentos */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>👁️</span>
                  <span>Avistamentos ({sightings.length})</span>
                </h3>
              </div>
              
              {loadingSightings ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <SightingsList 
                  sightings={sightings} 
                  itemOwnerId={selectedItem.owner_id}
                  currentUserId={user?.id}
                  onDelete={handleDeleteSighting}
                />
              )}
            </div>

            {/* Ações */}
            {user && String(user.id) === String(selectedItem.owner_id) && (
              <div className="flex gap-2 flex-wrap border-t pt-4">
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    navigate('/register-item', { state: { item: selectedItem } });
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>✏️</span>
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este item?')) {
                      handleDelete(selectedItem.id);
                      setSelectedItem(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>🗑️</span>
                  <span>Excluir</span>
                </button>
              </div>
            )}

            {user && String(user.id) !== String(selectedItem.owner_id) && (
              <div className="flex gap-2 flex-wrap border-t pt-4">
                <button
                  onClick={() => {
                    loadOwnerSocialMedia(selectedItem.owner_id, true);
                    setContactModal({ open: true, item: selectedItem, message: '', sending: false, error: '' });
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>💬</span>
                  <span>Contato</span>
                </button>
                <button
                  onClick={() => setSightingModal({ open: true, item: selectedItem })}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>👁️</span>
                  <span>Reportar Avista</span>
                </button>
              </div>
            )}

            {!user && (
              <div className="flex gap-2 flex-wrap border-t pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>💬</span>
                  <span>Entrar para Contatar</span>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>👁️</span>
                  <span>Entrar para Reportar Avista</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact modal */}
      {contactModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-screen overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="mb-6 pb-4 border-b-2 border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-primary">Contato com o Proprietário</h3>
                <button
                  onClick={() => setContactModal({ open: false, item: null, message: '', sending: false, error: '' })}
                  className="text-2xl text-gray-400 hover:text-red-500 transition"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-gray-300">
                <span className="inline-block bg-accent/20 text-accent px-3 py-1 rounded-full">
                  📦 {contactModal.item?.title || contactModal.item?.name}
                </span>
              </div>
            </div>

            {/* Redes Sociais do Proprietário */}
            {ownerSocialMedia[contactModal.item?.owner_id] && (
              <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border-2 border-primary/30">
                <div className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <span>📱</span>
                  <span>Formas de Contato Direto</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ownerSocialMedia[contactModal.item?.owner_id].whatsapp && (
                    <a
                      href={`https://wa.me/${ownerSocialMedia[contactModal.item?.owner_id].whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">💬</span>
                      <span className="text-xs font-semibold">WhatsApp</span>
                    </a>
                  )}
                  
                  {ownerSocialMedia[contactModal.item?.owner_id].instagram && (
                    <a
                      href={`https://instagram.com/${ownerSocialMedia[contactModal.item?.owner_id].instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">📷</span>
                      <span className="text-xs font-semibold">Instagram</span>
                    </a>
                  )}
                  
                  {ownerSocialMedia[contactModal.item?.owner_id].facebook && (
                    <a
                      href={`https://facebook.com/${ownerSocialMedia[contactModal.item?.owner_id].facebook}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">👍</span>
                      <span className="text-xs font-semibold">Facebook</span>
                    </a>
                  )}
                  
                  {ownerSocialMedia[contactModal.item?.owner_id].twitter && (
                    <a
                      href={`https://twitter.com/${ownerSocialMedia[contactModal.item?.owner_id].twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">𝕏</span>
                      <span className="text-xs font-semibold">Twitter</span>
                    </a>
                  )}
                  
                  {ownerSocialMedia[contactModal.item?.owner_id].phone && (
                    <a
                      href={`tel:${ownerSocialMedia[contactModal.item?.owner_id].phone}`}
                      className="flex items-center gap-2 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">☎️</span>
                      <span className="text-xs font-semibold">Ligação</span>
                    </a>
                  )}
                  
                  {ownerSocialMedia[contactModal.item?.owner_id].linkedin && (
                    <a
                      href={`https://linkedin.com/in/${ownerSocialMedia[contactModal.item?.owner_id].linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <span className="text-lg">🔗</span>
                      <span className="text-xs font-semibold">LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Separador */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-xs text-gray-400 font-semibold">OU</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* Chat do Sistema */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-primary mb-2">
                📧 Enviar Mensagem via Chat do Sistema
              </label>
              <textarea
                value={contactModal.message}
                onChange={e => setContactModal(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Escreva sua mensagem aqui... (máximo 500 caracteres)"
                maxLength="500"
                className="w-full h-32 bg-gray-800 border-2 border-gray-700 text-gray-100 placeholder-gray-500 p-3 rounded-lg focus:border-primary focus:outline-none resize-none text-sm"
              />
              <div className="text-xs text-gray-400 text-right mt-1">
                {contactModal.message.length}/500 caracteres
              </div>
            </div>

            {contactModal.error && (
              <div className="mb-4 p-3 bg-red-900/30 border-2 border-red-700 rounded-lg text-red-300 text-sm font-semibold flex items-center gap-2">
                <span>❌</span>
                {contactModal.error}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setContactModal({ open: false, item: null, message: '', sending: false, error: '' })}
                className="px-6 py-3 rounded-lg border-2 border-gray-700 hover:bg-gray-800 text-gray-300 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={sendContact}
                disabled={contactModal.sending || !contactModal.message.trim()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {contactModal.sending ? '⏳ Enviando...' : '✉️ Enviar Mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Claim Modal */}
      <RewardClaimModal
        isOpen={rewardClaimModal.open}
        reward={rewardClaimModal.reward}
        onClose={() => setRewardClaimModal({ open: false, reward: null })}
        onSuccess={() => {
          alert('✅ Sua reclamação de recompensa foi enviada! O proprietário analisará sua solicitação.');
          setSelectedItem(null);
          // Recarregar itens
          supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false })
            .then(({ data }) => setItems(data || []));
        }}
      />

      {/* Sighting Modal */}
      <SightingModal 
        isOpen={sightingModal.open}
        onClose={() => setSightingModal({ open: false, item: null })}
        itemId={sightingModal.item?.id}
        itemName={sightingModal.item?.title || sightingModal.item?.name}
        itemType={sightingModal.item?.item_type}
        onSuccess={() => {
          alert('✅ Avistamento reportado com sucesso! O proprietário será notificado.');
          loadSightings(selectedItem.id);
        }}
      />
    </div>
  )
}

