import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Image,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import * as rewardsService from '../services/rewards';
import Button from '../components/Button';
import Input from '../components/Input';
import { states, citiesByState, neighborhoodsByCity } from '../lib/br-locations';
import { Picker } from '@react-native-picker/picker';
import Card from '../components/Card';
import { analyzeItemWithVision } from '../services/aiItemSuggestions';

const ITEM_TYPES = {
  animal: {
    label: 'Animal',
    fields: {
      required: [
        'animal_name',
        'species',
        'breed',
        'color',
        'size',
        'age',
        'microchip'
      ],
      optional: [
        'collar',
        'serial_number',
        'brand',
        'description'
      ],
    },
    fieldLabels: {
      animal_name: 'Nome do animal',
      species: 'Espécie',
      breed: 'Raça',
      color: 'Cor',
      size: 'Porte',
      age: 'Idade',
      collar: 'Coleira (descrição)',
      microchip: 'Microchipado?',
      serial_number: 'Características especiais',
      brand: 'Raça/Tipo',
      description: 'Descrição',
    },
    placeholders: {
      animal_name: 'Ex: Thor',
      species: 'Ex: Cachorro, Gato',
      breed: 'Ex: Golden Retriever',
      color: 'Ex: Dourado',
      size: 'Ex: Grande, Médio, Pequeno',
      age: 'Ex: Filhote, Adulto, Idoso',
      collar: 'Ex: Coleira azul com medalha',
      microchip: 'Selecione',
      serial_number: 'Ex: Coleira azul, cicatriz na orelha',
      brand: 'Ex: Vira-lata, Poodle, Persa',
      description: 'Descreva detalhes importantes...',
    },
  },
  outro: {
    label: 'Outro',
    fields: {
      required: ['title'],
      optional: ['brand', 'color', 'serial_number'],
    },
    fieldLabels: {
      brand: 'Marca/Tipo',
      color: 'Cor',
      serial_number: 'Características/Detalhes',
    },
    placeholders: {
      title: 'Ex: Chave, Guarda-chuva, Outro item',
      brand: 'Ex: Tipo ou marca do item',
      color: 'Ex: Cor predominante',
      serial_number: 'Ex: Detalhes, características únicas',
    },
  },
  document: {
    label: 'Documento',
    fields: {
      required: ['title', 'brand'],
      optional: ['serial_number', 'color'],
    },
    fieldLabels: {
      brand: 'Tipo de documento',
      color: 'Cor',
      serial_number: 'Número/Detalhes',
    },
    placeholders: {
      title: 'Ex: RG, CNH, Passaporte',
      brand: 'Ex: RG, CNH, Passaporte',
      color: 'Ex: Azul, Verde',
      serial_number: 'Ex: 12345678-9',
    },
  },
  object: {
    label: 'Objeto',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serial_number'],
    },
    fieldLabels: {
      brand: 'Marca',
      color: 'Cor',
      serial_number: 'Características especiais',
    },
    placeholders: {
      title: 'Ex: Mochila preta, Livro de ficção científica',
      brand: 'Ex: Mochila Adidas, Livro "Game of Thrones"',
      color: 'Ex: Preto com detalhes vermelhos',
      serial_number: 'Ex: Com zíper quebrado, adesivo na lateral',
    },
  },
  electronics: {
    label: 'Eletrônico',
    fields: {
      required: ['title', 'brand', 'color'],
      optional: ['serial_number'],
    },
    fieldLabels: {
      brand: 'Marca/Modelo',
      color: 'Cor',
      serial_number: 'Número de série/IMEI',
    },
    placeholders: {
      title: 'Ex: iPhone 13, Fone AirPods',
      brand: 'Ex: iPhone 13 Pro, Samsung Galaxy S21',
      color: 'Ex: Preto, Prata',
      serial_number: 'Ex: A2846B1C9D7E5F3G',
    },
  },
  jewelry: {
    label: 'Joia/Acessório',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serial_number'],
    },
    fieldLabels: {
      brand: 'Material',
      color: 'Cor',
      serial_number: 'Marcas distintivas',
    },
    placeholders: {
      title: 'Ex: Anel de ouro, Colar com pedra azul',
      brand: 'Ex: Ouro 18k, Prata 925',
      color: 'Ex: Dourado, Prateado',
      serial_number: 'Ex: Gravado "Para Maria", com pedra azul',
    },
  },
  clothing: {
    label: 'Roupa',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber'],
    },
    fieldLabels: {
      brand: 'Tamanho/Marca',
      color: 'Cor',
      serialNumber: 'Detalhes/padrão',
    },
    placeholders: {
      title: 'Ex: Jaqueta de couro, Calça jeans',
      brand: 'Ex: P, M, G, GG / Nike, Adidas',
      color: 'Ex: Azul marinho com listras brancas',
      serialNumber: 'Ex: Bolsos laterais, etiqueta vermelha',
    },
  },
};

const RegisterItemScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const editItem = route?.params?.editItem || null;
  // Debug: verifique se editItem está chegando corretamente
  useEffect(() => {
    if (editItem) {
      console.log('Editando item:', editItem);
    }
  }, [editItem]);
  // Prioriza tipo vindo por parâmetro, depois do editItem, nunca deixa nulo se veio por navegação
  // Normaliza categoria para minúsculo e garante fallback para 'outro'
  function normalizeCategory(cat) {
    if (!cat) return null;
    const key = String(cat).toLowerCase();
    if (ITEM_TYPES[key]) return key;
    // fallback: se não existir, retorna 'outro' se existir
    if (ITEM_TYPES['outro']) return 'outro';
    return null;
  }
  const initialType = normalizeCategory(route?.params?.itemType || route?.params?.category || editItem?.category);
  const [step, setStep] = useState(editItem || initialType ? 2 : 1);
  const [itemType, setItemType] = useState(initialType);
  const [status, setStatus] = useState(editItem?.status || 'lost');
  const [title, setTitle] = useState(editItem?.title || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [state, setState] = useState(editItem?.state || (userProfile?.state || ''));
  const [city, setCity] = useState(editItem?.city || (userProfile?.city || ''));
  const [neighborhood, setNeighborhood] = useState(editItem?.neighborhood || '');
  const [date, setDate] = useState(
    editItem?.date ? editItem.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Campos genéricos
  const [brand, setBrand] = useState(editItem?.brand || editItem?.extra_fields?.brand || '');
  const [color, setColor] = useState(editItem?.color || editItem?.extra_fields?.color || '');
  const [serialNumber, setSerialNumber] = useState(editItem?.serial_number || editItem?.extra_fields?.serial_number || '');

  // Campos detalhados para animal
  const [animalSpecies, setAnimalSpecies] = useState(editItem?.extra_fields?.species || '');
  const [animalBreed, setAnimalBreed] = useState(editItem?.extra_fields?.breed || '');
  const [animalSize, setAnimalSize] = useState(editItem?.extra_fields?.size || '');
  const [animalAge, setAnimalAge] = useState(editItem?.extra_fields?.age || '');
  const [animalCollar, setAnimalCollar] = useState(editItem?.extra_fields?.collar || '');
  const [animalMicrochip, setAnimalMicrochip] = useState(editItem?.extra_fields?.microchip || 'Não');
  const [animalName, setAnimalName] = useState(editItem?.extra_fields?.animal_name || '');
  
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // Reward
  const [offerReward, setOfferReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');

  // Modal para perguntar se encontrou o item
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [lastCreatedItemId, setLastCreatedItemId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [foundModalMessage, setFoundModalMessage] = useState('');
  const [foundModalTitle, setFoundModalTitle] = useState('');
  const [foundModalVisible, setFoundModalVisible] = useState(false);
  const [foundModalItemId, setFoundModalItemId] = useState(null);

  // Carregar fotos e todos os dados antigos quando editar item
  useEffect(() => {
    if (editItem) {
      // Carregar fotos antigas
      if (editItem.item_photos && editItem.item_photos.length > 0) {
        const oldPhotos = editItem.item_photos.map(photo => ({
          uri: photo.url,
          type: 'image/jpeg',
          name: photo.url.split('/').pop(),
          id: photo.id, // Marcar como foto antiga
        }));
        setPhotos(oldPhotos);
      }
      // Garantir que todos os dados estão carregados
      if (editItem.title) setTitle(editItem.title);
      if (editItem.description) setDescription(editItem.description);
      if (editItem.state) setState(editItem.state);
      if (editItem.city) setCity(editItem.city);
      if (editItem.neighborhood) setNeighborhood(editItem.neighborhood);
      // Preencher campos genéricos a partir das colunas principais OU extra_fields
      if (typeof editItem.brand !== 'undefined') setBrand(editItem.brand);
      else if (editItem.extra_fields && typeof editItem.extra_fields.brand !== 'undefined') setBrand(editItem.extra_fields.brand);
      if (typeof editItem.color !== 'undefined') setColor(editItem.color);
      else if (editItem.extra_fields && typeof editItem.extra_fields.color !== 'undefined') setColor(editItem.extra_fields.color);
      if (typeof editItem.serial_number !== 'undefined') setSerialNumber(editItem.serial_number);
      else if (editItem.extra_fields && typeof editItem.extra_fields.serial_number !== 'undefined') setSerialNumber(editItem.extra_fields.serial_number);
      // Campos de animal
      if (editItem.extra_fields) {
        if (typeof editItem.extra_fields.species !== 'undefined') setAnimalSpecies(editItem.extra_fields.species);
        if (typeof editItem.extra_fields.breed !== 'undefined') setAnimalBreed(editItem.extra_fields.breed);
        if (typeof editItem.extra_fields.size !== 'undefined') setAnimalSize(editItem.extra_fields.size);
        if (typeof editItem.extra_fields.age !== 'undefined') setAnimalAge(editItem.extra_fields.age);
        if (typeof editItem.extra_fields.collar !== 'undefined') setAnimalCollar(editItem.extra_fields.collar);
        if (typeof editItem.extra_fields.microchip !== 'undefined') setAnimalMicrochip(editItem.extra_fields.microchip);
        if (typeof editItem.extra_fields.animal_name !== 'undefined') setAnimalName(editItem.extra_fields.animal_name);
      }
    } else {
      // Se não estiver editando, preenche cidade/estado do perfil
      if (userProfile?.state) setState(userProfile.state);
      if (userProfile?.city) setCity(userProfile.city);
    }
  }, [editItem, userProfile]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Faça login para registrar itens</Text>
          <Button
            title="Ir para Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          />
        </Card>
      </View>
    );
  }

  const handleSelectType = (type) => {
    setItemType(type);
    setStep(2);
  };

  const handleDateSelect = (day) => {
    setDate(day.dateString);
    setShowDatePicker(false);
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const pickImage = async () => {
    try {
      console.log('[pickImage] Requesting permissions...');
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (libraryStatus !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para selecionar fotos');
        return;
      }

      console.log('[pickImage] Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
      });

      console.log('[pickImage] Result:', result);

      if (!result.canceled && result.assets) {
        console.log('[pickImage] Selected photos:', result.assets.length);
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || asset.uri.split('/').pop(),
        }));
        setPhotos([...photos, ...newPhotos]);
        Alert.alert('Sucesso', `${newPhotos.length} foto(s) adicionada(s)`);
      }
    } catch (error) {
      console.error('[RegisterItem] Falha ao selecionar fotos:', error);
      Alert.alert('Erro', 'Falha ao selecionar fotos: ' + error.message);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleGenerateWithAI = async () => {
    if (!photos.length) {
      console.warn('[RegisterItem] Tentativa de gerar com IA sem foto.');
      Alert.alert('Foto necessária', 'Adicione uma foto antes de gerar as informações com IA.');
      return;
    }

    try {
      console.log('[RegisterItem] Iniciando geração com IA', { itemType, status, photoCount: photos.length });
      setAiLoading(true);
      setError('');
      const primaryPhoto = photos[0];
      const suggestions = await analyzeItemWithVision({
        imageUri: primaryPhoto.uri,
        itemType,
        status,
      });

      console.log('[RegisterItem] Sugestões recebidas da IA:', suggestions);

      if (itemType === 'animal') {
        if (suggestions.animal_name) setAnimalName(suggestions.animal_name);
        if (suggestions.species) setAnimalSpecies(suggestions.species);
        if (suggestions.breed) setAnimalBreed(suggestions.breed);
        if (suggestions.size) setAnimalSize(suggestions.size);
        if (suggestions.age) setAnimalAge(suggestions.age);
        if (suggestions.collar) setAnimalCollar(suggestions.collar);
        if (suggestions.microchip) setAnimalMicrochip(suggestions.microchip);
      }

      if (suggestions.title) setTitle(suggestions.title);
      if (suggestions.description) setDescription(suggestions.description);
      if (suggestions.brand) setBrand(suggestions.brand);
      if (suggestions.color) setColor(suggestions.color);
      if (suggestions.serial_number) setSerialNumber(suggestions.serial_number);

      const message = suggestions.source === 'gemini'
        ? 'Informações sugeridas pela IA foram preenchidas. Revise antes de publicar.'
        : 'O app preencheu um rascunho básico para você revisar, porque a IA não estava disponível no momento.';

      Alert.alert('Sugestão pronta', message);
    } catch (err) {
      console.error('[RegisterItem] Falha ao gerar com IA:', err);
      Alert.alert('Erro ao gerar com IA', err.message || 'Não foi possível gerar as informações.');
    } finally {
      setAiLoading(false);
    }
  };

  const validateFields = () => {
    setError('');

    if (!itemType) {
      setError('Selecione um tipo de item');
      return false;
    }

    // Em modo edição, aceitar valores antigos - não obrigar a preencher tudo novamente
    if (editItem) {
      if (!date.trim() && !editItem.date) {
        setError('Selecione a data');
        return false;
      }
      // Localização e nome agora opcionais
      return true;
    }

    // Modo de CRIAÇÃO - validação rigorosa
    // Nome do item/animal agora opcional

    const config = ITEM_TYPES[itemType];

    // Validar campos obrigatórios
    if (config.fields.required.includes('brand') && !brand.trim()) {
      setError(`${config.fieldLabels.brand} é obrigatório`);
      return false;
    }
    if (config.fields.required.includes('color') && !color.trim()) {
      setError(`${config.fieldLabels.color} é obrigatório`);
      return false;
    }
    if (config.fields.required.includes('serialNumber') && !serialNumber.trim()) {
      setError(`${config.fieldLabels.serialNumber} é obrigatório`);
      return false;
    }

    if (!date.trim()) {
      setError('Selecione a data');
      return false;
    }
    // Localização agora opcional
    if (!status) {
      setError('Selecione se perdeu ou encontrou');
      return false;
    }

    return true;
  };

  const handlePublish = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      // Definir corretamente o título para animal
      let currentTitle = itemType === 'animal' ? animalName : title;
      // Se title estiver vazio, garantir valor padrão para evitar erro no banco
      if (!currentTitle || currentTitle.trim() === '') {
        currentTitle = 'Sem título';
      }
      // Em modo edição, usar dados antigos se não foram modificados
      const toNull = v => (typeof v === 'string' && v.trim() === '' ? null : v);
      const itemData = {
        title: toNull(currentTitle) || editItem?.title || 'Sem título',
        description: toNull(description) || editItem?.description,
        state: toNull(state) || editItem?.state,
        city: toNull(city) || editItem?.city,
        neighborhood: toNull(neighborhood) || editItem?.neighborhood,
        status: toNull(status) || editItem?.status,
        category: toNull(itemType) || editItem?.category,
        item_type: toNull(itemType) || editItem?.item_type,
        date: date ? `${date}T00:00:00-03:00` : editItem?.date,
        // Características em colunas específicas
        brand: toNull(brand),
        color: toNull(color),
        serial_number: toNull(serialNumber),
        species: toNull(animalSpecies),
        breed: toNull(animalBreed),
        size: toNull(animalSize),
        age: toNull(animalAge),
        collar: toNull(animalCollar),
        microchip: toNull(animalMicrochip),
        animal_name: toNull(animalName),
        // Também salva em extra_fields para compatibilidade
        extra_fields: {
          brand: toNull(brand),
          color: toNull(color),
          serial_number: toNull(serialNumber),
          species: toNull(animalSpecies),
          breed: toNull(animalBreed),
          size: toNull(animalSize),
          age: toNull(animalAge),
          collar: toNull(animalCollar),
          microchip: toNull(animalMicrochip),
          animal_name: toNull(animalName),
          reward_amount: toNull(rewardAmount) || null,
          reward_description: toNull(rewardDescription) || null,
          offer_reward: Boolean(offerReward && (rewardAmount || rewardDescription)),
        },
      };

      if (!editItem) {
        itemData.owner_id = user.id;
      }

      let resultItem;
      if (editItem) {
        // Modo de edição
        resultItem = await itemsService.updateItem(editItem.id, itemData);

        // Atualizar ou criar recompensa se necessário
        if (offerReward && (rewardAmount || rewardDescription)) {
          // Buscar recompensa existente
          const existingRewards = await rewardsService.getRewardByItemId(editItem.id);
          const existingReward = Array.isArray(existingRewards) ? existingRewards[0] : existingRewards;
          if (existingReward?.id) {
            await rewardsService.updateReward(existingReward.id, {
              amount: rewardAmount || null,
              description: rewardDescription || null,
              currency: 'BRL',
              status: 'active',
            });
          } else {
            await rewardsService.createReward({
              item_id: editItem.id,
              owner_id: user.id,
              amount: rewardAmount || null,
              currency: 'BRL',
              description: rewardDescription || null,
              status: 'active',
            });
          }
        }

        // Remover apenas as fotos antigas que o usuário excluiu
        if (editItem.item_photos && editItem.item_photos.length > 0) {
          // Fotos antigas que ainda estão no array photos
          const remainingOldPhotoIds = photos
            .filter(photo => photo.id) // só fotos antigas
            .map(photo => photo.id);
          // Fotos antigas que foram removidas pelo usuário
          const removedOldPhotos = editItem.item_photos.filter(photo => !remainingOldPhotoIds.includes(photo.id));
          for (const removedPhoto of removedOldPhotos) {
            try {
              await itemsService.removeItemPhoto(removedPhoto.id, removedPhoto.url);
            } catch (err) {
              console.error('[RegisterItem] Erro ao remover foto antiga:', err);
            }
          }
        }

        // Upload de todas as fotos locais (novas)
        if (photos && photos.length > 0) {
          for (const photo of photos) {
            // Só faz upload se for arquivo local (não tem id)
            if (!photo.id && photo.uri && (photo.uri.startsWith('file://') || photo.uri.startsWith('content://'))) {
              try {
                await itemsService.saveItemPhoto(editItem.id, photo);
              } catch (err) {
                console.error('[RegisterItem] Erro ao processar foto:', err);
              }
            }
          }
        }

        Alert.alert('Sucesso', 'Item atualizado com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              // Voltar para o detalhe do item; ItemDetail recarrega on-focus
              navigation.goBack();
            },
          },
        ]);
      } else {
        // Modo de criação
        resultItem = await itemsService.registerItem(itemData, photos);

        // Criar recompensa se necessário
        if (offerReward && (rewardAmount || rewardDescription)) {
          console.log('[RegisterItem] Criando recompensa para item_id:', resultItem.id, 'valor:', rewardAmount, 'desc:', rewardDescription);
          await rewardsService.createReward({
            item_id: resultItem.id,
            owner_id: user.id,
            amount: rewardAmount || null,
            currency: 'BRL',
            description: rewardDescription || null,
            status: 'active',
          });
        }

        // Sempre mostrar mensagem de sucesso e redirecionar
        Alert.alert('Sucesso', 'Item registrado com sucesso!', [
          {
            text: 'Ir para Home',
            onPress: () => {
              // Resetar formulário
              setItemType(null);
              setStep(1);
              setTitle('');
              setDescription('');
              setState('');
              setCity('');
              setNeighborhood('');
              setDate(new Date().toISOString().split('T')[0]);
              setBrand('');
              setColor('');
              setSerialNumber('');
              setPhotos([]);
              setRewardAmount('');
              setRewardDescription('');
              setOfferReward(false);
              setError('');
              navigation.navigate('MainApp', { screen: 'HomeTab', params: { refresh: true } });
              // Se for item perdido, mostrar modal após redirecionar
              if (status === 'lost') {
                setTimeout(() => {
                  setFoundModalTitle('Você encontrou seu item?');
                  setFoundModalMessage('Você acabou de registrar que perdeu um item. Caso você encontre, pode excluir a publicação. Você já encontrou seu item?');
                  setFoundModalItemId(resultItem.id);
                  setFoundModalVisible(true);
                }, 1000);
              }
            },
          },
        ]);
        // Função para excluir item se usuário confirmar que encontrou
        const handleFoundItemConfirm = async () => {
          if (!foundModalItemId) return;
          setDeleting(true);
          try {
            await itemsService.deleteItem(foundModalItemId);
            setFoundModalVisible(false);
            Alert.alert('Publicação excluída', 'Sua publicação foi removida com sucesso.');
            // Resetar formulário
            setItemType(null);
            setStep(1);
            setTitle('');
            setDescription('');
            setState('');
            setCity('');
            setNeighborhood('');
            setDate(new Date().toISOString().split('T')[0]);
            setBrand('');
            setColor('');
            setSerialNumber('');
            setPhotos([]);
            setRewardAmount('');
            setRewardDescription('');
            setOfferReward(false);
            setError('');
            navigation.navigate('MainApp', { screen: 'HomeTab', params: { refresh: true } });
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir a publicação. Tente novamente.');
          } finally {
            setDeleting(false);
          }
        };
        {/* Modal de confirmação se encontrou o item */}
        <Modal
          visible={foundModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFoundModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '85%', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>{foundModalTitle}</Text>
              <Text style={{ fontSize: 16, color: '#374151', marginBottom: 24, textAlign: 'center' }}>{foundModalMessage}</Text>
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <Button
                  title="Ainda não"
                  variant="secondary"
                  onPress={() => {
                    setFoundModalVisible(false);
                    // Resetar formulário
                    setItemType(null);
                    setStep(1);
                    setTitle('');
                    setDescription('');
                    setState('');
                    setCity('');
                    setNeighborhood('');
                    setDate(new Date().toISOString().split('T')[0]);
                    setBrand('');
                    setColor('');
                    setSerialNumber('');
                    setPhotos([]);
                    setRewardAmount('');
                    setRewardDescription('');
                    setOfferReward(false);
                    setError('');
                    navigation.navigate('MainApp', { screen: 'HomeTab', params: { refresh: true } });
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={deleting ? 'Excluindo...' : 'Sim, já encontrei'}
                  onPress={handleFoundItemConfirm}
                  disabled={deleting}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao registrar item';
      console.error('Erro ao registrar:', err);
      setError(errorMsg);
      
      // Mostrar alerta com opção de continuar sem fotos
      if (errorMsg.includes('Network') || errorMsg.includes('upload') || errorMsg.includes('request failed')) {
        Alert.alert(
          'Aviso de Conexão',
          'Não foi possível fazer upload das fotos. Deseja continuar e adicionar fotos depois?',
          [
            {
              text: 'Tentar Novamente',
              onPress: () => setLoading(false),
            },
            {
              text: 'Prosseguir Sem Fotos',
              onPress: async () => {
                try {
                  const itemData = {
                    owner_id: user.id,
                    title,
                    description,
                    state,
                    city,
                    neighborhood,
                    status,
                    category: itemType,
                    item_type: itemType,
                    date: `${date}T00:00:00Z`,
                    extra_fields: {
                      brand,
                      color,
                      serial_number: serialNumber,
                    },
                  };

                  const createdItem = await itemsService.registerItem(itemData, []);

                  // Criar recompensa se necessário
                  if (offerReward && (rewardAmount || rewardDescription)) {
                    await rewardsService.createReward({
                      item_id: createdItem.id,
                      owner_id: user.id,
                      amount: rewardAmount || null,
                      currency: 'BRL',
                      description: rewardDescription || null,
                      status: 'active',
                    });
                  }
                  
                  Alert.alert('Sucesso', 'Item registrado sem fotos!', [
                    {
                      text: 'Ir para Home',
                      onPress: () => {
                        setItemType(null);
                        setStep(1);
                        setTitle('');
                        setDescription('');
                        setState('');
                        setCity('');
                        setNeighborhood('');
                        setDate(new Date().toISOString().split('T')[0]);
                        setBrand('');
                        setColor('');
                        setSerialNumber('');
                        setPhotos([]);
                        setRewardAmount('');
                        setRewardDescription('');
                        setOfferReward(false);
                        setError('');
                        navigation.navigate('HomeTab', { refresh: true });
                      },
                    },
                  ]);
                } catch (retryErr) {
                  setError(retryErr.message || 'Erro ao registrar item');
                  setLoading(false);
                }
              },
            },
          ]
        );
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Selecionar tipo
  if (step === 1 && !itemType) {
    // Se estiver editando, mostrar apenas o tipo já selecionado, sem exigir nova escolha
    if (editItem && editItem.category) {
      const normalized = normalizeCategory(editItem.category);
      return (
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Item</Text>
            <Text style={styles.subtitle}>Tipo: {ITEM_TYPES[normalized]?.label || normalized || editItem.category}</Text>
            <Text style={{ color: '#DC2626', marginTop: 16, fontWeight: 'bold' }}>
              Não é possível alterar o tipo do item após a publicação. Para mudar o tipo, exclua e crie um novo item.
            </Text>
          </View>
          <Button title="Avançar" onPress={() => {
            setItemType(normalized);
            setStep(2);
          }} />
        </ScrollView>
      );
    }
    // Criação normal - novo design
    const typeOptions = [
      {
        key: 'animal',
        label: 'Animal',
        desc: 'Cães, gatos, aves e outros animais',
        color: '#F3E8FF',
        icon: '🐾'
      },
      {
        key: 'object',
        label: 'Objeto',
        desc: 'Celulares, carteiras, chaves, etc.',
        color: '#E0E7FF',
        icon: '📦'
      },
      {
        key: 'document',
        label: 'Documento',
        desc: 'RG, CPF, CNH, cartões, etc.',
        color: '#FEF3C7',
        icon: '📄'
      },
      {
        key: 'electronics',
        label: 'Eletrônico',
        desc: 'Celulares, notebooks, fones, etc.',
        color: '#DBF4FF',
        icon: '💻'
      },
      {
        key: 'jewelry',
        label: 'Joia/Acessório',
        desc: 'Anéis, colares, relógios, etc.',
        color: '#FFF1F2',
        icon: '💍'
      },
      {
        key: 'clothing',
        label: 'Roupa',
        desc: 'Jaquetas, calças, bonés, etc.',
        color: '#ECFDF5',
        icon: '👕'
      },
      {
        key: 'outro',
        label: 'Outro',
        desc: 'Outros itens não listados',
        color: '#FEE2E2',
        icon: '🧩'
      }
    ];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>Registrar Item</Text>
          <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>Primeiro, selecione a categoria do item</Text>
        </View>
        <View style={{ gap: 18, marginHorizontal: 12, marginBottom: 32 }}>
          {typeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelectType(opt.key)}
              style={{ borderRadius: 18, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 0 }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}>
                <View style={{ backgroundColor: opt.color, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 18 }}>
                  <Text style={{ fontSize: 26 }}>{opt.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1F2937' }}>{opt.label}</Text>
                  <Text style={{ color: '#6B7280', fontSize: 15, marginTop: 2 }}>{opt.desc}</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#D1D5DB', marginLeft: 8 }}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Step 2: Detalhes do Item
  if (step === 2) {
    const config = ITEM_TYPES[itemType];
    if (!config) {
      // Tenta fallback para 'outro' se não existir
      if (ITEM_TYPES['outro']) {
        setItemType('outro');
        return null;
      }
      return (
        <ScrollView style={styles.container}>
          <Card style={styles.card}>
            <Text style={styles.title}>Erro ao carregar tipo de item</Text>
            <Text>Por favor, selecione o tipo de item novamente.</Text>
            <Button title="Voltar" onPress={() => {
              setItemType(null);
              setStep(1);
            }} />
          </Card>
        </ScrollView>
      );
    }

    // Animal: formulário detalhado
    if (itemType === 'animal') {
      return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 180 }}>
            <View>

              {/* Status question at the top */}
              <View style={styles.statusContainer}>
                <Text style={styles.label}>Você perdeu ou encontrou? *</Text>
                <View style={styles.statusOptions}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'lost' && styles.statusButtonActive,
                    ]}
                    onPress={() => setStatus('lost')}
                  >
                    <Text style={[
                      styles.statusText,
                      status === 'lost' && styles.statusTextActive,
                    ]}>
                      Perdi
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'found' && styles.statusButtonActive,
                    ]}
                    onPress={() => setStatus('found')}
                  >
                    <Text style={[
                      styles.statusText,
                      status === 'found' && styles.statusTextActive,
                    ]}>
                      Achei
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fotos do Animal - logo após status */}
              <Text style={styles.title}>Fotos do Animal</Text>
              <View style={styles.aiHintCard}>
                <Text style={styles.aiHintTitle}>Gerar com IA</Text>
                <Text style={styles.aiHintText}>Se você quiser colocar uma foto aqui para gerar rapidamente as informações, basta enviar a foto e clicar em gerar com a IA.</Text>
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
              >
                <Text style={styles.uploadButtonText}>+ Adicionar Fotos</Text>
              </TouchableOpacity>
              {photos.length > 0 && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleGenerateWithAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.aiButtonText}>Gerar com a IA</Text>
                  )}
                </TouchableOpacity>
              )}
              {photos.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={styles.photosTitle}>Fotos Selecionadas ({photos.length})</Text>
                  <FlatList
                    data={photos}
                    keyExtractor={(_, i) => i.toString()}
                    numColumns={3}
                    scrollEnabled={false}
                    renderItem={({ item, index }) => (
                      <View style={styles.photoItem}>
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.photo}
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Text style={styles.removePhotoText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Campos detalhados do animal */}
              <Input
                label="Nome do animal *"
                placeholder="Ex: Thor"
                value={animalName}
                onChangeText={setAnimalName}
                style={styles.input}
              />
              <Input
                label="Espécie *"
                placeholder="Ex: Cachorro, Gato"
                value={animalSpecies}
                onChangeText={setAnimalSpecies}
                style={styles.input}
              />
              <Input
                label="Raça *"
                placeholder="Ex: Golden Retriever"
                value={animalBreed}
                onChangeText={setAnimalBreed}
                style={styles.input}
              />
              <Input
                label="Cor *"
                placeholder="Ex: Dourado"
                value={color}
                onChangeText={setColor}
                style={styles.input}
              />
              <Input
                label="Porte *"
                placeholder="Ex: Grande, Médio, Pequeno"
                value={animalSize}
                onChangeText={setAnimalSize}
                style={styles.input}
              />
              <Input
                label="Idade *"
                placeholder="Ex: Filhote, Adulto, Idoso"
                value={animalAge}
                onChangeText={setAnimalAge}
                style={styles.input}
              />
              <Input
                label="Coleira (descrição)"
                placeholder="Ex: Coleira azul com medalha"
                value={animalCollar}
                onChangeText={setAnimalCollar}
                style={styles.input}
              />
              <View style={styles.input}>
                <Text style={styles.label}>Microchipado? *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      animalMicrochip === 'Sim' && styles.statusButtonActive,
                    ]}
                    onPress={() => setAnimalMicrochip('Sim')}
                  >
                    <Text style={[
                      styles.statusText,
                      animalMicrochip === 'Sim' && styles.statusTextActive,
                    ]}>
                      Sim
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      animalMicrochip === 'Não' && styles.statusButtonActive,
                    ]}
                    onPress={() => setAnimalMicrochip('Não')}
                  >
                    <Text style={[
                      styles.statusText,
                      animalMicrochip === 'Não' && styles.statusTextActive,
                    ]}>
                      Não
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Input
                label="Características especiais"
                placeholder="Ex: Coleira azul, cicatriz na orelha"
                value={serialNumber}
                onChangeText={setSerialNumber}
                style={styles.input}
              />
              <Input
                label="Raça/Tipo"
                placeholder="Ex: Vira-lata, Poodle, Persa"
                value={brand}
                onChangeText={setBrand}
                style={styles.input}
              />
              <Input
                label="Descrição (opcional)"
                placeholder="Descreva detalhes importantes..."
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={4}
                style={styles.input}
              />
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F9FAFB', padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
            <View style={{ flexDirection: 'row' }}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => navigation.goBack()}
                style={{ flex: 1 }}
              />
              <Button
                title="Próximo"
                onPress={() => setStep(4)}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      );
    }

    // Outros tipos: formulário dinâmico
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 180 }}>
          <View>

            {/* Status question at the top */}
            <View style={styles.statusContainer}>
              <Text style={styles.label}>Você perdeu ou encontrou? *</Text>
              <View style={styles.statusOptions}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 'lost' && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus('lost')}
                >
                  <Text style={[
                    styles.statusText,
                    status === 'lost' && styles.statusTextActive,
                  ]}>
                    Perdi
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 'found' && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus('found')}
                >
                  <Text style={[
                    styles.statusText,
                    status === 'found' && styles.statusTextActive,
                  ]}>
                    Achei
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Fotos do Item - logo após status */}
            <Text style={styles.title}>Fotos do Item</Text>
            <View style={styles.aiHintCard}>
              <Text style={styles.aiHintTitle}>Gerar com IA</Text>
              <Text style={styles.aiHintText}>Se você quiser colocar uma foto aqui para gerar rapidamente as informações, basta enviar a foto e clicar em gerar com a IA.</Text>
            </View>

            {itemType === 'document' && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ Documentos não podem ter fotos por segurança
                </Text>
              </View>
            )}

            {itemType !== 'document' && (
              <>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickImage}
                >
                  <Text style={styles.uploadButtonText}>+ Adicionar Fotos</Text>
                </TouchableOpacity>

                {photos.length > 0 && (
                  <TouchableOpacity
                    style={styles.aiButton}
                    onPress={handleGenerateWithAI}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.aiButtonText}>Gerar com a IA</Text>
                    )}
                  </TouchableOpacity>
                )}

                {photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosTitle}>Fotos Selecionadas ({photos.length})</Text>
                    <FlatList
                      data={photos}
                      keyExtractor={(_, i) => i.toString()}
                      numColumns={3}
                      scrollEnabled={false}
                      renderItem={({ item, index }) => (
                        <View style={styles.photoItem}>
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.photo}
                          />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => removePhoto(index)}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                )}
              </>
            )}

            {/* Campos dinâmicos após fotos */}
            {/* Campo de título sempre presente */}
            <Input
              key="title"
              label={config.fieldLabels.title ? config.fieldLabels.title + (config.fields.required.includes('title') ? ' *' : '') : 'Título'}
              placeholder={config.placeholders.title || 'Digite o título do item'}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
            {/* Campos dinâmicos após fotos, exceto title */}
            {config.fields.required.concat(config.fields.optional)
              .filter(field => field !== 'title' && config.fieldLabels[field] && config.placeholders[field])
              .map((field) => {
                let value = '';
                let onChangeText = () => {};
                if (field === 'brand') { value = brand; onChangeText = setBrand; }
                else if (field === 'color') { value = color; onChangeText = setColor; }
                else if (field === 'serial_number' || field === 'serialNumber') { value = serialNumber; onChangeText = setSerialNumber; }
                else { return null; }
                return (
                  <Input
                    key={field}
                    label={config.fieldLabels[field] + (config.fields.required.includes(field) ? ' *' : '')}
                    placeholder={config.placeholders[field]}
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.input}
                  />
                );
              })}
            <Input
              label="Descrição (opcional)"
              placeholder="Descreva detalhes importantes..."
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              style={styles.input}
            />
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F9FAFB', padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
          <View style={{ flexDirection: 'row' }}>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={{ flex: 1 }}
            />
            <Button
              title="Próximo"
              onPress={() => setStep(4)}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Step 4: Localização e Recompensa
  if (step === 4) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 0 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Localização e Recompensa</Text>

          {/* Estado (opcional) */}
          <View style={styles.input}>
            <Text style={styles.label}>Estado</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f3f4f6' }}>
              <Picker
                selectedValue={state}
                onValueChange={(value) => {
                  setState(value);
                  setCity('');
                  setNeighborhood('');
                }}
                style={{ height: 48, color: '#1F2937' }}
              >
                <Picker.Item label="Selecione o estado" value="" />
                {states.map((uf) => (
                  <Picker.Item key={uf} label={uf} value={uf} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Cidade (opcional) */}
          <View style={styles.input}>
            <Text style={styles.label}>Cidade</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f3f4f6' }}>
              <Picker
                selectedValue={city}
                onValueChange={(value) => {
                  setCity(value);
                  setNeighborhood('');
                }}
                enabled={!!state}
                style={{ height: 48, color: '#1F2937' }}
              >
                <Picker.Item label="Selecione a cidade" value="" />
                {(citiesByState[state] || []).map((c) => (
                  <Picker.Item key={c} label={c} value={c} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Bairro (opcional) */}
          <View style={styles.input}>
            <Text style={styles.label}>Bairro</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff' }}>
              <Picker
                selectedValue={neighborhood}
                onValueChange={setNeighborhood}
                enabled={!!city}
                style={{ height: 48 }}
              >
                <Picker.Item label="Selecione o bairro" value="" />
                {(neighborhoodsByCity[city] || []).map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>Data do Evento *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                {formatDateDisplay(date)}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.calendarWrapper}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Selecione a Data</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Calendar
                  current={date}
                  minDate="2020-01-01"
                  maxDate={new Date().toISOString().split('T')[0]}
                  onDayPress={handleDateSelect}
                  markedDates={{
                    [date]: {
                      selected: true,
                      selectedColor: '#2563EB',
                      selectedTextColor: '#FFFFFF',
                    },
                  }}
                  theme={{
                    backgroundColor: '#FFFFFF',
                    calendarBackground: '#FFFFFF',
                    textSectionTitleColor: '#374151',
                    selectedDayBackgroundColor: '#2563EB',
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: '#2563EB',
                    dayTextColor: '#374151',
                    arrowColor: '#2563EB',
                    monthTextColor: '#1F2937',
                  }}
                />
                <Button
                  title="Fechar"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </Modal>

          {/* Reward Section */}
          <View style={styles.rewardSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setOfferReward(!offerReward)}
            >
              <View style={[styles.checkbox, offerReward && styles.checkboxChecked]}>
                {offerReward && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Oferecer Recompensa</Text>
            </TouchableOpacity>

            {offerReward && (
              <>
                <Input
                  label="Valor da Recompensa"
                  placeholder="Ex: 100"
                  value={rewardAmount}
                  onChangeText={setRewardAmount}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <Input
                  label="Descrição da Recompensa"
                  placeholder="Ex: Dinheiro ou cartão presente"
                  value={rewardDescription}
                  onChangeText={setRewardDescription}
                  style={styles.input}
                />
              </>
            )}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
        {/* Botões fixos na base, igual aos outros passos */}
        <View style={[styles.navigation, { position: 'absolute', left: 0, right: 0, bottom: 44, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', padding: 16, zIndex: 10 }]}> 
          <Button
            title="Voltar"
            variant="secondary"
            onPress={() => setStep(2)}
            style={{ flex: 1 }}
          />
          <Button
            title={loading ? 'Publicando...' : 'Publicar'}
            onPress={handlePublish}
            disabled={loading}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
        {loading && (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  card: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '48%',
  },
  typeCard: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  statusButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  aiHintCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  aiHintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 4,
  },
  aiHintText: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 18,
  },
  aiButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    marginBottom: 16,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  photosContainer: {
    marginBottom: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  photoItem: {
    flex: 1,
    margin: 4,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  calendarWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  modalButton: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  rewardSection: {
    backgroundColor: '#FFFAED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
  },
  navigation: {
    flexDirection: 'row',
    marginTop: 20,
  },
  messageCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  button: {
    marginTop: 12,
  },
});

export default RegisterItemScreen;
