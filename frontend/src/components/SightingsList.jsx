export default function SightingsList({ sightings, itemOwnerId, currentUserId, onDelete }) {
  if (!sightings || sightings.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
        <p className="text-gray-400 text-sm">
          Nenhum avistamento reportado ainda. Seja o primeiro! 👁️
        </p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="space-y-3">
      {sightings.map((sighting) => (
        <div
          key={sighting.id}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {sighting.profiles?.avatar_url ? (
                  <img
                    src={sighting.profiles.avatar_url}
                    alt={sighting.profiles.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {sighting.profiles?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white text-sm">
                    {sighting.profiles?.name || 'Anônimo'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(sighting.created_at)}</p>
                </div>
              </div>
            </div>
            
            {/* Delete button - apenas para dono do item ou quem criou */}
            {(itemOwnerId === currentUserId || sighting.user_id === currentUserId) && (
              <button
                onClick={() => onDelete(sighting.id)}
                className="text-gray-400 hover:text-red-400 transition text-lg"
                title="Deletar avistamento"
              >
                ✕
              </button>
            )}
          </div>

          {/* Localização */}
          <div className="mb-2">
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              📍 {sighting.location}
            </p>
          </div>

          {/* Descrição */}
          {sighting.description && (
            <p className="text-sm text-gray-300 mb-3">{sighting.description}</p>
          )}

          {/* Foto */}
          {sighting.photo_url && (
            <img
              src={sighting.photo_url}
              alt="Foto do avistamento"
              className="w-full h-32 object-cover rounded mb-3 border border-gray-700"
            />
          )}

          {/* Contato */}
          {sighting.contact_info && (
            <div className="bg-primary/10 border border-primary/30 rounded px-3 py-2">
              <p className="text-xs text-gray-400 mb-1">📞 Contato de quem viu:</p>
              <p className="text-sm text-primary font-medium break-all">{sighting.contact_info}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
