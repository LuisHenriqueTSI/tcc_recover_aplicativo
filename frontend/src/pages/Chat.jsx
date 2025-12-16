import SimpleSidebar from '../components/SimpleSidebar'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function Chat() {
  const { user, loading } = useAuth();
  
  console.log('[Chat] Component rendered. Loading:', loading, 'User:', user?.id);
  
  const [inbox, setInbox] = useState([]); // now stores todo o histórico (enviadas + recebidas)
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [nameMap, setNameMap] = useState({}); // cache sender_id -> name
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [message, setMessage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Arquivo de foto selecionado
  const [photoPreview, setPhotoPreview] = useState(null); // Preview da foto
  const [receiverId, setReceiverId] = useState('');
  const [itemId, setItemId] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, sender_id, content }
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Handle photo selection
  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Selecione apenas imagens');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande (máximo 5MB)');
      return;
    }
    
    setSelectedPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result);
    };
    reader.readAsDataURL(file);
  }

  // Clear photo selection
  function clearPhotoSelection() {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  }

  // Busca inbox completa (enviadas + recebidas) e preenche nomes
  const loadInbox = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      console.log('[Chat] Initial load starting...');
      setLoadingInbox(true);
    }
    setInboxError('');
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log(`[Chat] Loading messages (isPolling=${isPolling})...`);
      
      // Buscar mensagens enviadas pelo usuário
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false });
      
      // Buscar mensagens recebidas pelo usuário
      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .order('sent_at', { ascending: false });
      
      if (sentError) {
        console.error('[Chat] Error loading sent messages:', sentError);
        throw sentError;
      }
      if (receivedError) {
        console.error('[Chat] Error loading received messages:', receivedError);
        throw receivedError;
      }
      
      // Combinar e ordenar por data
      const msgArray = [...(sentMessages || []), ...(receivedMessages || [])]
        .sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
      
      if (!isPolling) console.log(`[Chat] Total messages: ${msgArray.length}`);
      
      // Buscar nomes dos participantes
      const ids = Array.from(new Set([
        ...msgArray.map(m => String(m.sender_id)).filter(Boolean),
        ...msgArray.map(m => String(m.receiver_id)).filter(Boolean)
      ]));
      
      let profileMap = { ...nameMap };
      const missing = ids.filter(id => !profileMap[id]);
      
      if (missing.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', missing);
        
        if (!profileError && profiles) {
          profiles.forEach(p => {
            profileMap[String(p.id)] = {
              name: p.name || p.email?.split('@')[0] || 'Usuário',
              email: p.email || ''
            };
          });
          setNameMap(profileMap);
        }
      }

      // Buscar títulos dos itens
      const itemIds = Array.from(new Set(msgArray.map(m => m.item_id).filter(Boolean)));
      const itemMap = {};
      if (itemIds.length > 0) {
        const { data: items, error: itemError } = await supabase
          .from('items')
          .select('id, title')
          .in('id', itemIds);
        
        if (!itemError && items) {
          items.forEach(item => {
            itemMap[item.id] = item.title;
          });
        }
      }
      
      // Enriquecer mensagens
      const enrichedMsgs = msgArray.map(m => {
        const isMine = String(m.sender_id) === String(user.id);
        const otherId = isMine ? m.receiver_id : m.sender_id;
        const senderData = profileMap[String(m.sender_id)];
        const receiverData = profileMap[String(m.receiver_id)];
        const otherData = profileMap[String(otherId)];
        
        return {
          ...m,
          sender_name: senderData?.name || 'Usuário',
          sender_email: senderData?.email || '',
          receiver_name: receiverData?.name || 'Usuário',
          receiver_email: receiverData?.email || '',
          other_name: otherData?.name || 'Usuário',
          other_email: otherData?.email || '',
          other_id: otherId,
          item_title: m.item_id ? itemMap[m.item_id] || `Item #${m.item_id}` : null,
        };
      });
      
      // Comparar com a versão anterior para evitar re-renders desnecessários
      const prevInboxIds = JSON.stringify(inbox.map(m => ({ id: m.id, read: m.read })));
      const newInboxIds = JSON.stringify(enrichedMsgs.map(m => ({ id: m.id, read: m.read })));
      
      // Só atualizar se houver mudanças (novas mensagens ou status de leitura mudou)
      if (prevInboxIds !== newInboxIds) {
        setInbox(enrichedMsgs);
        if (!isPolling) console.log('[Chat] Inbox updated - changes detected');
        
        // Disparar evento de nova mensagem só quando há mudanças
        if (!isPolling) {
          window.dispatchEvent(new CustomEvent('new-message'));
        }
      } else if (!isPolling) {
        console.log('[Chat] Inbox loaded - no changes since last time');
      }
    } catch (e) {
      console.error('[Chat] Error loading inbox:', e);
      if (!isPolling) setInboxError(e.message || 'Erro ao buscar mensagens');
    } finally {
      if (!isPolling) setLoadingInbox(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    console.log('[Chat] User loaded, starting polling:', user.id);
    
    // Carregar inbox inicial
    loadInbox(false);
    
    // Polling a cada 3 segundos (reduzido de 800ms para evitar sobrecarga)
    const pollingInterval = setInterval(() => {
      loadInbox(true);
    }, 3000);
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [user, loadInbox]);

  // Marcar mensagem como lida quando clicar nela
  async function handleMarkAsRead(msg) {
    if (msg.read) return; // Já está lida
    
    try {
      console.log('[Chat] Marking message as read:', msg.id);
      const { error } = await supabase
        .from('messages')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', msg.id);
      
      if (!error) {
        console.log('[Chat] Message marked as read:', msg.id);
        // Atualizar a mensagem localmente
        setInbox(prevInbox => 
          prevInbox.map(m => m.id === msg.id ? { ...m, read: true, read_at: new Date().toISOString() } : m)
        );
        // Disparar evento para atualizar o contador
        window.dispatchEvent(new CustomEvent('messages-read'));
      } else {
        console.error('[Chat] Failed to mark message as read:', response.status);
      }
    } catch (e) {
      console.error('[Chat] Error marking message as read:', e);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    // if replying, receiverId comes from replyTo unless explicitly provided
    const to = selectedConversation?.other_id || selectedConversation?.sender_id || replyTo?.sender_id || receiverId;
    if ((!message && !selectedPhoto) || !to) return alert('Preencha o destinatário e a mensagem ou anexe uma foto');
    setSending(true);
    try {
      let photoUrl = null;
      
      // Upload photo if selected
      if (selectedPhoto) {
        const fileName = `${user.id}-${Date.now()}-${selectedPhoto.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-photos')
          .upload(fileName, selectedPhoto, { upsert: false });
        
        if (uploadError) {
          throw new Error(`Erro ao enviar foto: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-photos')
          .getPublicUrl(fileName);
        
        photoUrl = urlData?.publicUrl;
        clearPhotoSelection();
      }
      
      const payload = {
        sender_id: user?.id,
        receiver_id: to,
        // if user didn't fill itemId but this is a reply, inherit item_id from replied message
        item_id: itemId || (selectedConversation?.item_id) || (replyTo?.item_id) || null,
        content: message,
        photo_url: photoUrl, // Add photo URL to message
        reply_to_id: replyTo ? replyTo.id : null,
        read: false
      };
      
      const { data: saved, error } = await supabase
        .from('messages')
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message || 'Erro ao enviar mensagem');
      }
      
      setMessage('');
      // Don't clear receiverId or itemId when in a conversation
      if (!selectedConversation) {
        setReceiverId('');
        setItemId('');
      }
      setReplyTo(null);
      
      // otimista: adiciona a mensagem enviada na lista atual (com nomes enriquecidos)
      const enrichedSaved = {
        ...saved,
        sender_name: saved.sender_name || nameMap[String(saved.sender_id)] || 'Usuário',
        receiver_name: saved.receiver_name || nameMap[String(saved.receiver_id)] || 'Usuário',
      };
      setInbox(prev => [...prev, enrichedSaved]);
      // se a conversa atual está aberta, atualiza sua lista de mensagens
      if (selectedKey) {
        setSelectedConversation(prev => {
          if (!prev) return prev;
          const isMine = String(saved.sender_id) === String(user?.id);
          const otherId = isMine ? saved.receiver_id : saved.sender_id;
          const key = `${otherId}-${saved.item_id || 'general'}`;
          if (key !== selectedKey) return prev;
          const msgs = [...(prev.messages || []), enrichedSaved].sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
          return { ...prev, messages: msgs, lastMessage: enrichedSaved };
        });
      }
      // refresh histórico completo em segundo plano
      loadInbox();
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      alert(e.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function markConversationAsRead(conv) {
    if (!conv || !user) return;
    const unread = (conv.messages || []).filter(m => String(m.receiver_id) === String(user.id) && m.read === false);
    if (unread.length === 0) return;
    try {
      const now = new Date().toISOString();
      
      // Atualizar localmente PRIMEIRO (feedback imediato)
      setInbox(prev => prev.map(m => unread.find(u => u.id === m.id) ? { ...m, read: true, read_at: now } : m));
      
      // Depois atualizar no banco
      await Promise.all(unread.map(async (m) => {
        try {
          await supabase
            .from('messages')
            .update({ 
              read: true,
              read_at: now
            })
            .eq('id', m.id);
          console.log('[Chat] Message marked as read:', m.id);
        } catch (err) {
          console.error('[Chat] Failed to mark message as read:', err);
        }
      }));
      
      // Disparar evento para atualizar contador
      window.dispatchEvent(new CustomEvent('messages-read'));
    } catch (e) {
      console.error('[Chat] Error marking conversation read:', e);
    }
  }

  const handleSelectConversation = (msg) => {
    setSelectedConversation(msg);
    const key = `${msg.other_id || msg.sender_id}-${msg.item_id || 'general'}`;
    setSelectedKey(key);
    // marcar como lidas as mensagens recebidas nessa conversa
    markConversationAsRead(msg);
    setReceiverId(msg.other_id || msg.sender_id);
    setItemId(msg.item_id || '');
  };

  // Re-sincroniza a conversa selecionada após atualizar inbox
  useEffect(() => {
    if (!selectedKey || !user) return;
    const convMap = {};
    inbox.forEach(m => {
      const isMine = String(m.sender_id) === String(user.id);
      const otherId = isMine ? m.receiver_id : m.sender_id;
      const key = `${otherId}-${m.item_id || 'general'}`;
      if (!convMap[key]) {
        convMap[key] = { ...m, other_id: otherId, messages: [m], lastMessage: m, unreadCount: (!isMine && m.read === false) ? 1 : 0 };
      } else {
        convMap[key].messages.push(m);
        const msgDate = new Date(m.sent_at || 0);
        const lastDate = new Date(convMap[key].lastMessage.sent_at || 0);
        if (msgDate > lastDate) convMap[key].lastMessage = m;
        if (!isMine && m.read === false) convMap[key].unreadCount++;
      }
    });
    if (convMap[selectedKey]) {
      setSelectedConversation(convMap[selectedKey]);
    }
  }, [inbox, selectedKey, user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredInbox = inbox.filter(msg => {
    if (!searchQuery) return true;
    const senderName = msg.sender_name || nameMap[String(msg.sender_id)] || '';
    const content = msg.content || '';
    const itemTitle = msg.item_title || '';
    return senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           content.toLowerCase().includes(searchQuery.toLowerCase()) ||
           itemTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group messages by conversation (outro participante + item_id)
  const conversations = {};
  filteredInbox.forEach(msg => {
    const isMine = String(msg.sender_id) === String(user?.id);
    const otherId = isMine ? msg.receiver_id : msg.sender_id;
    const key = `${otherId}-${msg.item_id || 'general'}`;
    if (!conversations[key]) {
      conversations[key] = {
        ...msg,
        other_id: otherId,
        messages: [msg],
        lastMessage: msg,
        unreadCount: (!isMine && msg.read === false) ? 1 : 0
      };
    } else {
      conversations[key].messages.push(msg);
      const msgDate = new Date(msg.created_at || msg.sent_at || msg.inserted_at || 0);
      const lastDate = new Date(conversations[key].lastMessage.created_at || conversations[key].lastMessage.sent_at || conversations[key].lastMessage.inserted_at || 0);
      if (msgDate > lastDate) {
        conversations[key].lastMessage = msg;
      }
      if (!isMine && msg.read === false) {
        conversations[key].unreadCount++;
      }
    }
  });

  const conversationList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage.sent_at || 0) - new Date(a.lastMessage.sent_at || 0)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-dark rounded-xl p-6 text-center border border-white/10">
          <div className="text-text-secondary-dark font-semibold mb-2">Carregando...</div>
        </div>
      </div>
    );
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

  return (
    <div className="flex h-screen w-full bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      
      {/* Main Content */}
      <main className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        {/* Chat Interface */}
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] flex-1 overflow-hidden">
          {/* Conversations Panel */}
          <aside className="flex flex-col bg-panel-dark border-r border-white/10 overflow-y-auto">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary-dark">Mensagens</h2>
                <button
                  onClick={loadInbox}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                  title="Atualizar"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Atualizar
                </button>
              </div>
              <label className="flex flex-col w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-11">
                  <div className="text-text-secondary-dark flex bg-background-dark items-center justify-center pl-3.5 rounded-l-lg border-r-0">
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>search</span>
                  </div>
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-text-primary-dark focus:outline-0 focus:ring-2 focus:ring-inset focus:ring-primary border-none bg-background-dark h-full placeholder:text-text-secondary-dark pl-2 text-sm font-normal" 
                    placeholder="Pesquisar conversas..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            <nav className="flex-1 space-y-1 p-2">
              {loadingInbox ? (
                <div className="text-text-secondary-dark text-center py-8">Carregando...</div>
              ) : inboxError ? (
                <div className="text-red-400 text-center py-8 px-4">{inboxError}</div>
              ) : conversationList.length === 0 ? (
                <div className="text-text-secondary-dark text-center py-8">Nenhuma mensagem</div>
              ) : (
                conversationList.map((conv, idx) => {
                  const otherId = conv.other_id || conv.sender_id;
                  const displayName = conv.other_name || 'Usuário';
                  const displayEmail = conv.other_email || '';
                  const displayItemTitle = conv.item_title || (conv.item_id ? `Item #${conv.item_id}` : 'Sem item');
                  return (
                  <a
                    key={idx}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex gap-4 px-4 py-3 justify-between rounded-lg cursor-pointer transition-colors ${
                      selectedConversation && selectedConversation.item_id === conv.item_id && selectedConversation.other_id === (conv.other_id || conv.sender_id)
                        ? 'bg-primary/20 hover:bg-primary/30'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 shrink-0" 
                        style={{ 
                          backgroundImage: `url("https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3B82F6&color=fff")` 
                        }}
                      />
                      <div className="flex flex-1 flex-col justify-center overflow-hidden">
                        <p className="text-text-primary-dark text-base font-medium leading-normal truncate">
                          {displayName}
                        </p>
                        <p className="text-text-secondary-dark text-xs font-normal leading-normal truncate">
                          {displayEmail}
                        </p>
                        <p className="text-text-secondary-dark text-sm font-normal leading-normal truncate">
                          {displayItemTitle}
                        </p>
                        <p className="text-text-primary-dark text-sm font-normal leading-normal truncate">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end justify-between">
                      <p className="text-text-secondary-dark text-xs font-normal">
                        {formatTime(conv.lastMessage.created_at || conv.lastMessage.sent_at)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <div className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </a>
                )})
              )}
            </nav>
          </aside>

          {/* Chat View Panel */}
          <section className="flex flex-col bg-background-dark overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
                  <div className="flex items-center gap-4">
                    <div 
                      className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                      style={{ 
                        backgroundImage: `url("https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConversation.other_name || 'U')}&background=3B82F6&color=fff")` 
                      }}
                    />
                    <div>
                      <h3 className="font-semibold text-text-primary-dark">
                        {selectedConversation.other_name || 'Usuário'}
                      </h3>
                      <p className="text-sm text-text-secondary-dark">
                        {selectedConversation.other_email || 'sem email'}
                      </p>
                      <a className="text-xs text-primary hover:underline cursor-pointer">
                        {selectedConversation.item_title || (selectedConversation.item_id ? `Item #${selectedConversation.item_id}` : 'Sem item')}
                      </a>
                    </div>
                  </div>
                  <button className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-white/10 text-text-secondary-dark">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {selectedConversation.messages
                    .slice()
                    .sort((a, b) => new Date(a.created_at || a.sent_at || a.inserted_at || 0) - new Date(b.created_at || b.sent_at || b.inserted_at || 0))
                    .map((msg, idx) => {
                    const isMyMessage = msg.sender_id === user?.id;
                    
                    return (
                      <div key={idx} className={`flex items-end gap-3 ${isMyMessage ? 'justify-end' : 'max-w-lg'}`}>
                        {!isMyMessage && (
                          <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 self-end" 
                            style={{ 
                              backgroundImage: `url("https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || nameMap[String(msg.sender_id)] || 'Usuário')}&background=3B82F6&color=fff")` 
                            }}
                          />
                        )}
                        <div className={`relative flex flex-col gap-1 ${isMyMessage ? 'items-end' : ''}`}>
                          {msg.photo_url && (
                            <img 
                              src={msg.photo_url} 
                              alt="Chat photo" 
                              className={`max-w-sm max-h-64 rounded-lg ${isMyMessage ? 'rounded-br-none' : 'rounded-bl-none'}`}
                            />
                          )}
                          {msg.content && (
                            <div className={`p-3 rounded-lg ${
                              isMyMessage 
                                ? 'bg-primary rounded-br-none max-w-lg' 
                                : 'bg-panel-dark rounded-bl-none'
                            }`}>
                              <p className={`text-sm ${isMyMessage ? 'text-white' : 'text-text-primary-dark'}`}>
                                {msg.content}
                              </p>
                            </div>
                          )}
                          <span className={`text-xs text-text-secondary-dark ${isMyMessage ? 'pr-1' : 'pl-1'}`}>
                            {formatMessageTime(msg.created_at || msg.sent_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-white/10 p-4">
                  {photoPreview && (
                    <div className="mb-4 relative">
                      <img src={photoPreview} alt="Preview" className="max-h-40 rounded-lg" />
                      <button
                        type="button"
                        onClick={clearPhotoSelection}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="flex items-center gap-2 bg-panel-dark rounded-xl pr-2">
                    <input 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary-dark placeholder:text-text-secondary-dark py-3 px-4" 
                      placeholder="Digite sua mensagem..." 
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={sending}
                    />
                    
                    {/* Photo Button */}
                    <label className="flex items-center justify-center size-9 hover:bg-white/10 rounded-lg cursor-pointer transition-colors text-text-secondary-dark shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoSelect}
                        disabled={sending}
                        className="hidden"
                      />
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                    </label>
                    
                    <button 
                      type="submit"
                      disabled={sending || (!message.trim() && !selectedPhoto)}
                      className="flex items-center justify-center size-9 bg-primary rounded-lg text-white hover:bg-blue-500 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary-dark">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">chat</span>
                  <p className="text-lg">Selecione uma conversa para começar</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
