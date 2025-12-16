import SimpleSidebar from '../components/SimpleSidebar';
import ShareButton from '../components/ShareButton';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerItem, updateItem, analyzeImage, saveItemPhoto } from '../services/items';
import { createReward } from '../services/rewards';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const ITEM_TYPES = {
  animal: {
    label: 'Animal',
    icon: 'pets',
    description: 'Cães, gatos, etc.',
    color: 'primary',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber']
    },
    fieldLabels: {
      brand: 'Raça/Tipo',
      color: 'Cor',
      serialNumber: 'Características especiais'
    }
  },
  document: {
    label: 'Documento',
    icon: 'badge',
    description: 'RG, CNH, Passaporte, etc.',
    color: 'primary',
    fields: {
      required: ['title', 'brand'],
      optional: ['serialNumber', 'color']
    },
    fieldLabels: {
      brand: 'Tipo de documento',
      color: 'Cor',
      serialNumber: 'Número/Detalhes'
    }
  },
  object: {
    label: 'Objeto',
    icon: 'backpack',
    description: 'Mochila, chaves, livros, etc.',
    color: 'primary',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber']
    },
    fieldLabels: {
      brand: 'Marca',
      color: 'Cor',
      serialNumber: 'Características especiais'
    }
  },
  electronics: {
    label: 'Eletrônico',
    icon: 'devices',
    description: 'Celular, notebook, fones, etc.',
    color: 'primary',
    fields: {
      required: ['title', 'brand', 'color'],
      optional: ['serialNumber']
    },
    fieldLabels: {
      brand: 'Marca/Modelo',
      color: 'Cor',
      serialNumber: 'Número de série/IMEI'
    }
  },
  jewelry: {
    label: 'Joia/Acessório',
    icon: 'diamond',
    description: 'Anel, colar, relógio, etc.',
    color: 'secondary',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber']
    },
    fieldLabels: {
      brand: 'Material',
      color: 'Cor',
      serialNumber: 'Marcas distintivas'
    }
  },
  clothing: {
    label: 'Roupa',
    icon: 'apparel',
    description: 'Casaco, chapéu, cachecol, etc.',
    color: 'secondary',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber']
    },
    fieldLabels: {
      brand: 'Tamanho/Marca',
      color: 'Cor',
      serialNumber: 'Detalhes/padrão'
    }
  },
};

export default function RegisterItem() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editingItem = location.state?.item || null;

  // Form state
  const [itemType, setItemType] = useState(editingItem?.item_type || null);
  const [title, setTitle] = useState(editingItem?.title || '');
  const [brand, setBrand] = useState(editingItem?.extra_fields?.brand || '');
  const [color, setColor] = useState(editingItem?.extra_fields?.color || '');
  const [serialNumber, setSerialNumber] = useState(editingItem?.extra_fields?.serial_number || '');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [itemLocation, setItemLocation] = useState(editingItem?.location || '');
  const [date, setDate] = useState(editingItem?.date ? editingItem.date.split('T')[0] : '');
  const [status, setStatus] = useState(editingItem?.status || 'lost');
  const [category, setCategory] = useState(editingItem?.category || '');

  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Reward state
  const [offerReward, setOfferReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardDaysToExpire, setRewardDaysToExpire] = useState('30');

  // Carregar fotos existentes quando editando
  useEffect(() => {
    if (editingItem && editingItem.id) {
      const loadExistingPhotos = async () => {
        try {
          const { data, error } = await supabase
            .from('item_photos')
            .select('*')
            .eq('item_id', editingItem.id);
          
          if (!error && data) {
            setExistingPhotos(data);
          }
        } catch (err) {
          console.error('[RegisterItem] Erro ao carregar fotos:', err);
        }
      };
      loadExistingPhotos();
      
      // Garantir que o itemType está setado
      if (editingItem.item_type && !itemType) {
        setItemType(editingItem.item_type);
      }
      
      // Garantir que a categoria está setada
      if (editingItem.category && !category) {
        setCategory(editingItem.category);
      }
    }
  }, [editingItem]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
        <div className={`p-10 flex items-center justify-center transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
          Faça login para registrar itens
        </div>
      </div>
    );
  }

  const handleTypeSelect = (type) => {
    setItemType(type);
    setCategory(type);
    setCurrentStep(1);
  };

  // Validar campos obrigatórios para o tipo de item
  const getRequiredFields = () => {
    if (!itemType) return [];
    const itemConfig = ITEM_TYPES[itemType];
    const fields = [];
    
    itemConfig.fields.required.forEach(field => {
      switch(field) {
        case 'title':
          if (!title.trim()) fields.push('O que você achou/perdeu');
          break;
        case 'brand':
          if (!brand.trim()) fields.push(itemConfig.fieldLabels.brand);
          break;
        case 'color':
          if (!color.trim()) fields.push(itemConfig.fieldLabels.color);
          break;
        case 'serialNumber':
          if (!serialNumber.trim()) fields.push(itemConfig.fieldLabels.serialNumber);
          break;
        default:
          break;
      }
    });
    
    // Validações gerais (não relacionadas à categoria)
    if (!date.trim()) fields.push('Data do achado/perda');
    if (!itemLocation.trim()) fields.push('Local do achado/perda');
    if (!status) fields.push('Status (perdido/achado)');
    
    return fields;
  };

  // Renderizar campo dinamicamente baseado na categoria
  const renderCategoryField = (fieldKey, isRequired) => {
    const itemConfig = ITEM_TYPES[itemType];
    const label = itemConfig.fieldLabels[fieldKey];
    
    // Placeholders customizados por tipo e campo
    const getPlaceholder = () => {
      const placeholders = {
        animal: {
          brand: 'Ex: Vira-lata, Poodle, Persa',
          color: 'Ex: Marrom e branco, Preto',
          serialNumber: 'Ex: Coleira azul, cicatriz na orelha'
        },
        document: {
          brand: 'Ex: RG, CNH, Passaporte',
          color: 'Ex: Azul, Verde',
          serialNumber: 'Ex: 12345678-9'
        },
        object: {
          brand: 'Ex: Mochila Adidas, Livro "Game of Thrones"',
          color: 'Ex: Preto com detalhes vermelhos',
          serialNumber: 'Ex: Com zíper quebrado, adesivo na lateral'
        },
        electronics: {
          brand: 'Ex: iPhone 13 Pro, Samsung Galaxy S21',
          color: 'Ex: Preto, Prata',
          serialNumber: 'Ex: A2846B1C9D7E5F3G'
        },
        jewelry: {
          brand: 'Ex: Ouro 18k, Prata 925',
          color: 'Ex: Dourado, Prateado',
          serialNumber: 'Ex: Gravado "Para Maria", com pedra azul'
        },
        clothing: {
          brand: 'Ex: P, M, G, GG / Nike, Adidas',
          color: 'Ex: Azul marinho com listras brancas',
          serialNumber: 'Ex: Bolsos laterais, etiqueta vermelha'
        }
      };
      
      return placeholders[itemType]?.[fieldKey] || `Digite o ${label.toLowerCase()}...`;
    };
    
    switch(fieldKey) {
      case 'brand':
        return (
          <div key="brand">
            <label className="block text-sm font-medium text-white mb-2">
              {label} {isRequired ? '*' : '(opcional)'}
            </label>
            <input
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
              required={isRequired}
            />
          </div>
        );
      case 'color':
        return (
          <div key="color">
            <label className="block text-sm font-medium text-white mb-2">
              {label} {isRequired ? '*' : '(opcional)'}
            </label>
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
              required={isRequired}
            />
          </div>
        );
      case 'serialNumber':
        return (
          <div key="serialNumber">
            <label className="block text-sm font-medium text-white mb-2">
              {label} {isRequired ? '*' : '(opcional)'}
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
              required={isRequired}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos(prev => [...prev, { file, preview: event.target?.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId, photoUrl) => {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = photoUrl.split('/item-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Deletar do storage
        await supabase.storage
          .from('item-photos')
          .remove([filePath]);
      }
      
      // Deletar do banco de dados
      await supabase
        .from('item_photos')
        .delete()
        .eq('id', photoId);
      
      // Atualizar estado
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('[RegisterItem] Erro ao remover foto:', err);
      setError('Erro ao remover foto: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemType) {
      setError('Selecione um tipo de item');
      return;
    }
    if (!title) {
      setError('Preencha o nome do item');
      return;
    }

    // Validar campos obrigatórios da categoria
    const missingFields = getRequiredFields();
    if (missingFields.length > 0) {
      setError(`Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`);
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itemData = {
        title,
        description,
        location: itemLocation,
        status,
        category,
        item_type: itemType,
        extra_fields: {
          brand,
          color,
          serial_number: serialNumber,
        },
      };

      if (date) {
        itemData.date = `${date}T00:00:00Z`;
      }

      let createdItemData;
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
        
        // Upload novas fotos se houver
        if (photos && photos.length > 0) {
          console.log('[RegisterItem] Fazendo upload de', photos.length, 'novas fotos');
          for (const photo of photos) {
            try {
              const fileExt = photo.file.name.split('.').pop();
              const fileName = `${editingItem.id}/${Date.now()}.${fileExt}`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('item-photos')
                .upload(fileName, photo.file);

              if (uploadError) {
                console.error('[RegisterItem] Erro ao fazer upload:', uploadError);
                continue;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('item-photos')
                .getPublicUrl(fileName);

              await saveItemPhoto(editingItem.id, publicUrl);
            } catch (err) {
              console.error('[RegisterItem] Erro ao processar foto:', err);
            }
          }
        }
        
        setSuccess(true);
        setTimeout(() => navigate('/home'), 2000);
      } else {
        createdItemData = await registerItem(itemData);
        setCreatedItem(createdItemData);
        console.log('[RegisterItem] Item criado:', createdItemData);

        // Upload photos to Supabase Storage
        if (photos && photos.length > 0) {
          console.log('[RegisterItem] Iniciando upload de', photos.length, 'fotos');
          for (const photo of photos) {
            try {
              const fileExt = photo.file.name.split('.').pop();
              const fileName = `${createdItemData.id}/${Date.now()}.${fileExt}`;
              
              console.log('[RegisterItem] Fazendo upload:', fileName);
              
              // Upload para o Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('item-photos')
                .upload(fileName, photo.file);

              if (uploadError) {
                console.error('[RegisterItem] Erro ao fazer upload:', uploadError);
                setError(`Erro ao fazer upload da foto: ${uploadError.message}`);
                continue;
              }

              console.log('[RegisterItem] Upload bem-sucedido:', uploadData);

              // Obter URL pública
              const { data: { publicUrl } } = supabase.storage
                .from('item-photos')
                .getPublicUrl(fileName);

              console.log('[RegisterItem] URL pública:', publicUrl);

              // Salvar referência no banco
              try {
                const savedPhoto = await saveItemPhoto(createdItemData.id, publicUrl);
                console.log('[RegisterItem] Foto salva no banco:', savedPhoto);
              } catch (dbErr) {
                console.error('[RegisterItem] Erro ao salvar foto no banco:', dbErr);
                setError(`Erro ao salvar foto no banco: ${dbErr.message}`);
              }
            } catch (err) {
              console.error('[RegisterItem] Erro ao processar foto:', err);
              setError(`Erro ao processar foto: ${err.message}`);
            }
          }
        } else {
          console.log('[RegisterItem] Nenhuma foto selecionada');
        }

        // Criar recompensa se foi oferecida
        if (offerReward && rewardAmount && parseFloat(rewardAmount) > 0) {
          try {
            console.log('[RegisterItem] Criando recompensa...');
            const expiresAt = rewardDaysToExpire
              ? new Date(Date.now() + parseInt(rewardDaysToExpire) * 24 * 60 * 60 * 1000).toISOString()
              : null;

            await createReward(createdItemData.id, {
              amount: parseFloat(rewardAmount),
              description: rewardDescription,
              expiresAt,
            });

            console.log('[RegisterItem] Recompensa criada com sucesso!');
          } catch (rewardErr) {
            console.error('[RegisterItem] Erro ao criar recompensa:', rewardErr);
            // Não interrompe o fluxo, apenas loga o erro
            setError(`Aviso: Item criado, mas ocorreu erro ao criar recompensa: ${rewardErr.message}`);
          }
        }

        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Erro ao registrar item');
    } finally {
      setLoading(false);
    }
  };

  // Se não selecionou tipo ainda
  if (!itemType) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
        <main className={`flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 sm:px-8 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
          <div className="text-center">
            <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl">Seleção de Tipo de Item</h1>
            <p className="text-[#9da6b9] text-lg font-normal leading-normal mt-3 max-w-2xl">Para começar, escolha a categoria que melhor descreve o item que você deseja reportar.</p>
          </div>
          <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ITEM_TYPES).map(([key, type]) => (
              <button
                key={key}
                onClick={() => handleTypeSelect(key)}
                className={`group flex flex-col items-center justify-center gap-4 rounded-xl border border-solid border-white/10 bg-[#1a1d23] p-8 text-center transition-all duration-300 hover:-translate-y-1 ${
                  type.color === 'secondary' 
                    ? 'hover:border-secondary hover:shadow-2xl hover:shadow-secondary/20' 
                    : 'hover:border-primary hover:shadow-2xl hover:shadow-primary/20'
                }`}
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  type.color === 'secondary' 
                    ? 'bg-secondary/10 text-secondary group-hover:bg-secondary' 
                    : 'bg-primary/10 text-primary group-hover:bg-primary'
                } transition-colors group-hover:text-white`}>
                  <span className="material-symbols-outlined text-4xl">{type.icon}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white">{type.label}</h3>
                  <p className="text-sm text-[#9da6b9]">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
        <div className={`p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface-dark rounded-xl p-8 border border-white/10 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {editingItem ? 'Item Atualizado com Sucesso!' : 'Item Registrado com Sucesso!'}
              </h2>
              <p className="text-text-secondary-dark mb-8">
                {editingItem ? 'Suas alterações foram salvas.' : 'Compartilhe agora e maximize suas chances de encontrar!'}
              </p>

              {createdItem && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-8">
                  <div className="text-sm text-text-secondary-dark mb-1">Seu Item:</div>
                  <div className="text-2xl font-bold text-white">{createdItem.title}</div>
                </div>
              )}

              {createdItem && !editingItem && (
                <div className="mb-6">
                  <p className="text-text-secondary-dark mb-4">Compartilhe em suas redes sociais para aumentar as chances de encontrar:</p>
                  <div className="flex justify-center">
                    <ShareButton item={createdItem} />
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => navigate('/home')}
                  className="px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition"
                >
                  🏠 Ir para Home
                </button>
                {createdItem && !editingItem && (
                  <button
                    onClick={() => {
                      setItemType(null);
                      setTitle('');
                      setDescription('');
                      setItemLocation('');
                      setDate('');
                      setStatus('lost');
                      setCategory('');
                      setBrand('');
                      setColor('');
                      setSerialNumber('');
                      setPhotos([]);
                      setSuccess(false);
                    }}
                    className="px-8 py-3 rounded-lg bg-surface-dark border border-white/10 hover:bg-white/10 text-white font-semibold transition"
                  >
                    ➕ Registrar Outro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`p-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">Publicar Novo Item</h1>
            <p className="text-text-secondary-dark">Siga os passos para cadastrar seu item. Quanto mais detalhes, maior a chance de recuperá-lo.</p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex gap-4 justify-between items-center mb-3">
              <p className="text-white text-base font-medium">Passo {currentStep} de 3: {currentStep === 1 ? 'Detalhes do Item' : currentStep === 2 ? 'Fotos' : 'Localização e Tipo'}</p>
            </div>
            <div className="rounded-full bg-white/10 h-2">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Details */}
            {currentStep === 1 && (
              <div className="bg-surface-dark rounded-xl p-8 border border-white/10 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Detalhes do Item</h2>
                  <p className="text-text-secondary-dark text-sm">Tipo: <span className="font-semibold text-primary">{ITEM_TYPES[itemType].label}</span></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    O que você achou / perdeu? *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={(() => {
                      const placeholders = {
                        animal: 'Ex: Cachorro Golden Retriever, Gato Persa',
                        document: 'Ex: RG, CNH, Passaporte',
                        object: 'Ex: Mochila preta, Livro de ficção científica',
                        electronics: 'Ex: iPhone 13, Fone AirPods',
                        jewelry: 'Ex: Anel de ouro, Colar com pedra azul',
                        clothing: 'Ex: Jaqueta de couro, Calça jeans'
                      };
                      return placeholders[itemType] || 'Ex: Descrição do item';
                    })()}
                    className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Renderizar campos dinâmicos baseado na categoria */}
                  {ITEM_TYPES[itemType].fields.required.map(field => 
                    field !== 'title' && renderCategoryField(field, true)
                  )}
                  {ITEM_TYPES[itemType].fields.optional.map(field => 
                    renderCategoryField(field, false)
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descreva detalhes importantes como adesivos, arranhões, características especiais, etc."
                    rows="4"
                    className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3 resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-between pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setItemType(null)}
                    className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/10 text-white font-semibold transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Photos */}
            {currentStep === 2 && (
              <div className="bg-surface-dark rounded-xl p-8 border border-white/10 space-y-6">
                <h2 className="text-2xl font-bold text-white">Fotos do Item</h2>

                {/* Aviso para documentos */}
                {itemType === 'document' && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg flex items-start gap-3">
                    <span className="material-symbols-outlined flex-shrink-0 mt-0.5">warning</span>
                    <div>
                      <p className="font-semibold">Documentos não podem ter fotos</p>
                      <p className="text-sm mt-1">Por motivos de privacidade e segurança, não é permitido fazer upload de fotos de documentos. Você pode prosseguir para o próximo passo.</p>
                    </div>
                  </div>
                )}

                {/* Fotos Existentes */}
                {existingPhotos.length > 0 && itemType !== 'document' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Fotos Atuais</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                      {existingPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt="Foto existente"
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(photo.id, photo.url)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover foto"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload habilitado apenas para não-documentos */}
                {itemType !== 'document' && (
                  <>
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <span className="material-symbols-outlined text-4xl text-text-secondary-dark">upload_file</span>
                      <p className="text-white mt-2">Arraste e solte as fotos aqui ou <span className="font-bold text-primary">clique para selecionar</span></p>
                      <p className="text-sm text-text-secondary-dark mt-1">PNG, JPG, GIF até 10MB</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {photos.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Novas Fotos</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo.preview}
                                alt={`Foto ${index + 1}`}
                                className="aspect-square w-full rounded-lg object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
                      <p className="text-text-secondary-dark text-sm">Nossa IA pode preencher os detalhes para você a partir das fotos.</p>
                    </div>
                  </>
                )}

                {itemType === 'document' && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-2xl">info</span>
                    <p className="text-text-secondary-dark text-sm">Você pode prosseguir ao próximo passo para finalizar o registro do documento sem fotos.</p>
                  </div>
                )}

                <div className="flex gap-3 justify-between pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/10 text-white font-semibold transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Location and Status */}
            {currentStep === 3 && (
              <div className="bg-surface-dark rounded-xl p-8 border border-white/10 space-y-6">
                <h2 className="text-2xl font-bold text-white">Localização e Tipo</h2>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Endereço ou Ponto de Referência *</label>
                  <input
                    type="text"
                    value={itemLocation}
                    onChange={e => setItemLocation(e.target.value)}
                    placeholder="Onde o item foi perdido/achado?"
                    className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Data *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">O item foi achado ou perdido? *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full bg-surface-dark/60 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3"
                    required
                  >
                    <option value="">Selecione uma opção</option>
                    <option value="lost">Perdi este item</option>
                    <option value="found">Achei este item</option>
                  </select>
                </div>

                {/* Reward Section */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="offerReward"
                      checked={offerReward}
                      onChange={e => setOfferReward(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 text-yellow-500 cursor-pointer"
                    />
                    <label htmlFor="offerReward" className="text-white font-semibold cursor-pointer">
                      Oferecer Recompensa para Encontrar o Item
                    </label>
                  </div>

                  {offerReward && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Valor da Recompensa (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={rewardAmount}
                          onChange={(e) => setRewardAmount(e.target.value)}
                          placeholder="Ex: 100.00"
                          className="w-full bg-white/10 border border-yellow-500/30 text-white rounded-lg focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 px-4 py-3"
                        />
                        <p className="text-yellow-200/80 text-sm mt-1">
                          Este valor será oferecido a quem encontrar o item
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Descrição da Recompensa (opcional)
                        </label>
                        <textarea
                          value={rewardDescription}
                          onChange={(e) => setRewardDescription(e.target.value)}
                          placeholder="Ex: Recompensa por encontrar meu documento importante..."
                          rows="2"
                          className="w-full bg-white/10 border border-yellow-500/30 text-white rounded-lg focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 px-4 py-3 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Período de Validade
                        </label>
                        <select
                          value={rewardDaysToExpire}
                          onChange={(e) => setRewardDaysToExpire(e.target.value)}
                          className="w-full bg-white/10 border border-yellow-500/30 text-white rounded-lg focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 px-4 py-3"
                        >
                          <option value="7">7 dias</option>
                          <option value="15">15 dias</option>
                          <option value="30">30 dias</option>
                          <option value="60">60 dias</option>
                          <option value="90">90 dias</option>
                          <option value="">Sem expiração</option>
                        </select>
                      </div>

                      {rewardAmount && parseFloat(rewardAmount) > 0 && (
                        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-3">
                          <p className="text-yellow-200 text-sm">
                            <strong>Resumo:</strong> Você está oferecendo <strong className="text-yellow-300">R$ {parseFloat(rewardAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> como recompensa por encontrar este item.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/10 text-white font-semibold transition"
                  >
                    Voltar
                  </button>
                  <div className="flex-1 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        // Save draft
                      }}
                      className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/10 text-text-secondary-dark font-semibold transition"
                    >
                      Salvar Rascunho
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold transition"
                    >
                      {loading ? 'Publicando...' : 'Publicar Item'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

