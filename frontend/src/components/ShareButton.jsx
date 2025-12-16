import { useState, useRef, useEffect } from 'react';

export default function ShareButton({ item }) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const containerRef = useRef(null);

  if (!item) return null;

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!showMenu) return;

    function handleClickOutside(event) {
      // Verifica se clicou fora do menu E do botão
      const isClickOutsideMenu = menuRef.current && !menuRef.current.contains(event.target);
      const isClickOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target);
      
      if (isClickOutsideMenu && isClickOutsideButton) {
        setShowMenu(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const getShareText = () => {
    const status = item.status === 'found' ? '✅ ENCONTRADO' : '🔍 PERDIDO';
    const text = `${status}: ${item.title}\n\n${item.description || 'Sem descrição'}\n\n📍 Local: ${item.location || 'Não especificado'}\n📅 Data: ${item.date ? new Date(item.date).toLocaleDateString('pt-BR') : 'Não informada'}`;
    return text;
  };

  const handleCopyLink = async () => {
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}/home`;
    const text = getShareText();
    const fullText = `${text}\n\nVisite o Recover: ${shareUrl}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowMenu(false);
    } catch (err) {
      alert('Erro ao copiar: ' + err.message);
    }
  };

  const openShare = (platform) => {
    const text = getShareText();
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}/home`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);

    const links = {
      whatsapp: `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`,
      instagram: `https://www.instagram.com/`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    };

    if (platform === 'instagram') {
      // Instagram não tem deep link para compartilhar, então copiamos e abrimos
      navigator.clipboard.writeText(`${text}\n\n${shareUrl}`).catch(() => {});
      window.open(links.instagram, '_blank');
    } else if (links[platform]) {
      window.open(links[platform], '_blank', 'width=600,height=400');
    }
    
    setShowMenu(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="inline-flex items-center justify-center w-10 h-10 bg-black/70 hover:bg-black/80 text-white rounded-full transition-all shadow-md hover:shadow-lg"
        title="Compartilhar em redes sociais"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.15c.52.47 1.2.77 1.96.77 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.84 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.84 0 1.5-.31 2.04-.81l7.12 4.16c-.057.21-.087.43-.087.67 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
        </svg>
      </button>

      {showMenu && (
        <>
          {/* Menu com position absolute relativo ao container */}
          <div
            ref={menuRef}
            className="absolute top-full mt-2 right-0 z-50 bg-gray-900 border-2 border-gray-700 rounded-xl shadow-2xl p-2 min-w-max"
          >
            <div className="flex gap-1 items-center">
              <button
                onClick={() => openShare('whatsapp')}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-green-600/20 rounded-lg transition group"
                title="Compartilhar no WhatsApp"
              >
                <span className="text-xl">💬</span>
                <span className="text-[10px] font-semibold text-gray-300 group-hover:text-green-400">WhatsApp</span>
              </button>

              <button
                onClick={() => openShare('instagram')}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-pink-600/20 rounded-lg transition group"
                title="Compartilhar no Instagram"
              >
                <span className="text-xl">📷</span>
                <span className="text-[10px] font-semibold text-gray-300 group-hover:text-pink-400">Instagram</span>
              </button>

              <button
                onClick={() => openShare('facebook')}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-blue-600/20 rounded-lg transition group"
                title="Compartilhar no Facebook"
              >
                <span className="text-xl">👍</span>
                <span className="text-[10px] font-semibold text-gray-300 group-hover:text-blue-400">Facebook</span>
              </button>

              <div className="w-px h-8 bg-gray-700 mx-0.5" />

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-gray-600/20 rounded-lg transition group"
                title="Copiar para clipboard"
              >
                <span className="text-xl">📋</span>
                <span className="text-[10px] font-semibold text-gray-300 group-hover:text-gray-100">
                  {copied ? '✅' : 'Copiar'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

