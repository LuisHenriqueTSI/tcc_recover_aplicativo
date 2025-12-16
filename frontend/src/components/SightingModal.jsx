import { useState } from 'react';
import { createSighting } from '../services/sightings';
import { useAuth } from '../contexts/AuthContext';

export default function SightingModal({ isOpen, onClose, itemId, itemName, itemType, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    location: '',
    description: '',
    contactInfo: '',
    photo: null
  });
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Foto muito grande. Máximo 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        photo: file
      }));

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo: null
    }));
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.location.trim()) {
      setError('Por favor, indique o local do avistamento');
      return;
    }

    if (!formData.contactInfo.trim()) {
      setError('Por favor, forneça um meio de contato');
      return;
    }

    setLoading(true);
    try {
      const result = await createSighting({
        itemId,
        userId: user?.id,
        location: formData.location,
        description: formData.description,
        contactInfo: formData.contactInfo,
        photo: formData.photo
      });

      if (result.success) {
        setFormData({
          location: '',
          description: '',
          contactInfo: '',
          photo: null
        });
        setPhotoPreview(null);
        setError('');
        onSuccess?.();
        onClose();
      } else {
        setError('Erro ao reportar avistamento. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao enviar avistamento:', err);
      setError('Erro ao reportar avistamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-lg max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Reportar Avistamento</h2>
            <p className="text-xs text-gray-400 mt-1">{itemName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Local */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📍 Local do Avistamento *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Ex: Rua das Flores, nº 123, próximo à padaria"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📝 Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva o estado do item, comportamento do animal, se estava machucado, etc..."
              rows="3"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📷 Foto do Avistamento
            </label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded border border-gray-600"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-primary/50 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-2xl">📸</span>
                  <span className="text-xs text-gray-400 mt-1">Clique para enviar</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Contato */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📞 Seu Contato *
            </label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleInputChange}
              placeholder="WhatsApp, telefone ou Instagram"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              O proprietário usará isso para entrar em contato com você
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Reportar Avista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
