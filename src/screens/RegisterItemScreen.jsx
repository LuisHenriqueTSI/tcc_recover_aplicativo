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
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import * as rewardsService from '../services/rewards';
import Button from '../components/Button';
import Input from '../components/Input';
import MapLocationPicker from '../components/MapLocationPicker';
import { states } from '../lib/br-locations';
import Card from '../components/Card';
import { analyzeItemWithVision, validatePetPhoto } from '../services/aiItemSuggestions';

const PET_SPECIES_OPTIONS = [
  { label: 'Selecione a espécie', value: '' },
  { label: 'Cachorro', value: 'Cachorro' },
  { label: 'Gato', value: 'Gato' },
  { label: 'Bovino', value: 'Bovino' },
  { label: 'Ave', value: 'Ave' },
  { label: 'Cavalo', value: 'Cavalo' },
  { label: 'Outro', value: 'Outro' },
];

const PET_SPECIES_CHIPS = PET_SPECIES_OPTIONS.filter((option) => option.value);
const PET_COLOR_OPTIONS = ['Preto', 'Branco', 'Marrom', 'Laranja', 'Cinza', 'Amarelo', 'Dourado', 'Caramelo'];
const PET_SIZE_OPTIONS = ['Pequeno', 'Médio', 'Grande', 'Gigante'];
const PET_AGE_OPTIONS = ['Filhote', 'Adulto', 'Idoso', 'Não informado'];
const PET_BREED_OPTIONS = ['Sem raça definida'];
const PET_COLOR_ALIASES = {
  Preto: ['preto', 'preta', 'pretos', 'pretas'],
  Branco: ['branco', 'branca', 'brancos', 'brancas'],
  Marrom: ['marrom', 'marron'],
  Laranja: ['laranja', 'alaranjado', 'alaranjada'],
  Cinza: ['cinza', 'cinzento', 'cinzenta'],
  Amarelo: ['amarelo', 'amarela'],
  Dourado: ['dourado', 'dourada'],
  Caramelo: ['caramelo'],
};

const normalizeOptionValue = (value, options) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return options.find((option) => {
    const optionNormalized = option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized === optionNormalized || normalized.includes(optionNormalized);
  }) || raw;
};

const normalizeColorValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const detected = PET_COLOR_OPTIONS
    .map((option) => ({
      option,
      index: (PET_COLOR_ALIASES[option] || [option]).reduce((bestIndex, alias) => {
        const aliasIndex = normalized.indexOf(alias);
        return aliasIndex >= 0 && (bestIndex < 0 || aliasIndex < bestIndex) ? aliasIndex : bestIndex;
      }, -1),
    }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(({ option }) => option);

  return detected.length > 0 ? detected.join(' com ') : raw;
};

const getSelectedColorOptions = (value) => {
  const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PET_COLOR_OPTIONS.filter((option) => (PET_COLOR_ALIASES[option] || [option]).some((alias) => normalized.includes(alias)));
};

const SelectionChips = ({ label, options, value, onChange, multiSelect = false }) => (
  <View style={styles.selectionGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.selectionChips}>
      {options.map((option) => {
        const selected = multiSelect
          ? getSelectedColorOptions(value).includes(option)
          : String(value || '').toLowerCase() === option.toLowerCase();
        return (
          <TouchableOpacity
            key={option}
            style={[styles.selectionChip, selected && styles.selectionChipSelected]}
            onPress={() => onChange(option)}
            accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.selectionChipText, selected && styles.selectionChipTextSelected]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const normalizeSpeciesValue = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  if (lower.includes('cachor')) return 'Cachorro';
  if (lower.includes('gato') || lower.includes('cat')) return 'Gato';
  if (lower.includes('bovin') || lower.includes('vaca') || lower.includes('boi')) return 'Bovino';
  if (lower.includes('ave') || lower.includes('pássaro') || lower.includes('bird')) return 'Ave';
  if (lower.includes('cavalo') || lower.includes('horse')) return 'Cavalo';
  if (lower.includes('outro') || lower.includes('other')) return 'Outro';

  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const ITEM_TYPES = {
  animal: {
    label: 'Animal',
    fields: {
      required: ['species', 'color'],
      optional: ['breed', 'size', 'age', 'description'],
    },
    fieldLabels: {
      species: 'Espécie',
      breed: 'Raça',
      color: 'Cor',
      size: 'Porte',
      age: 'Idade',
      description: 'Descrição',
    },
    placeholders: {
      species: 'Ex: Cachorro, Gato',
      breed: 'Ex: Golden Retriever',
      color: 'Ex: Dourado',
      size: 'Ex: Grande, Médio, Pequeno',
      age: 'Ex: Filhote, Adulto, Idoso',
      description: 'Descreva detalhes importantes...',
    },
  },
  outro: {
    label: 'Outro',
    fields: {
      required: ['title'],
      optional: ['color', 'description'],
    },
    fieldLabels: {
      color: 'Cor',
      description: 'Descrição',
    },
    placeholders: {
      title: 'Ex: Chave, Guarda-chuva, Outro item',
      color: 'Ex: Cor predominante',
      description: 'Descreva detalhes que ajudem a identificar o item...',
    },
  },
  document: {
    label: 'Documento',
    fields: {
      required: ['title'],
      optional: ['description'],
    },
    fieldLabels: {
      description: 'Detalhes',
    },
    placeholders: {
      title: 'Ex: RG, CNH, Passaporte',
      description: 'Ex: 12345678-9, nome do titular ou observação',
    },
  },
  object: {
    label: 'Objeto',
    fields: {
      required: ['title'],
      optional: ['color', 'description'],
    },
    fieldLabels: {
      color: 'Cor',
      description: 'Descrição',
    },
    placeholders: {
      title: 'Ex: Mochila preta, Livro de ficção científica',
      color: 'Ex: Preto com detalhes vermelhos',
      description: 'Ex: Com zíper quebrado, adesivo na lateral',
    },
  },
  electronics: {
    label: 'Eletrônico',
    fields: {
      required: ['title'],
      optional: ['color', 'description'],
    },
    fieldLabels: {
      color: 'Cor',
      description: 'Detalhes',
    },
    placeholders: {
      title: 'Ex: iPhone 13, Fone AirPods',
      color: 'Ex: Preto, Prata',
      description: 'Ex: Número de série, IMEI ou observação',
    },
  },
  jewelry: {
    label: 'Joia/Acessório',
    fields: {
      required: ['title'],
      optional: ['color', 'description'],
    },
    fieldLabels: {
      color: 'Cor',
      description: 'Detalhes',
    },
    placeholders: {
      title: 'Ex: Anel de ouro, Colar com pedra azul',
      color: 'Ex: Dourado, Prateado',
      description: 'Ex: Gravado "Para Maria", com pedra azul',
    },
  },
  clothing: {
    label: 'Roupa',
    fields: {
      required: ['title'],
      optional: ['color', 'description'],
    },
    fieldLabels: {
      color: 'Cor',
      description: 'Detalhes',
    },
    placeholders: {
      title: 'Ex: Jaqueta de couro, Calça jeans',
      color: 'Ex: Azul marinho com listras brancas',
      description: 'Ex: Bolsos laterais, etiqueta vermelha',
    },
  },
};

const BRAZIL_REGION_TO_UF = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amapá: 'AP', amazonas: 'AM', bahia: 'BA',
  ceara: 'CE', ceará: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', 'espírito santo': 'ES',
  goias: 'GO', goiás: 'GO', maranhao: 'MA', maranhão: 'MA', 'mato grosso': 'MT',
  'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', pará: 'PA', paraiba: 'PB',
  paraíba: 'PB', parana: 'PR', paraná: 'PR', pernambuco: 'PE', piaui: 'PI', piauí: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', rondônia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP',
  'são paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
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

  function normalizeCategory(cat) {
    if (!cat) return null;
    const key = String(cat).toLowerCase();
    if (ITEM_TYPES[key]) return key;
    if (ITEM_TYPES['outro']) return 'outro';
    return null;
  }

  const initialType = normalizeCategory(route?.params?.itemType || route?.params?.category || editItem?.category) || 'animal';
  const [step, setStep] = useState(2);
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
  
  // Campos genéricos (colunas diretas da tabela + extra_fields)
  const [brand, setBrand] = useState(editItem?.brand || editItem?.extra_fields?.brand || '');
  const [color, setColor] = useState(editItem?.color || editItem?.extra_fields?.color || '');
  const [serialNumber, setSerialNumber] = useState(editItem?.serial_number || editItem?.extra_fields?.serial_number || '');

  // Campos detalhados para animal (colunas diretas da tabela + extra_fields)
  const [animalSpecies, setAnimalSpecies] = useState(editItem?.species || editItem?.extra_fields?.species || '');
  const [animalBreed, setAnimalBreed] = useState(editItem?.breed || editItem?.extra_fields?.breed || '');
  const [animalSize, setAnimalSize] = useState(editItem?.size || editItem?.extra_fields?.size || '');
  const [animalAge, setAnimalAge] = useState(editItem?.age || editItem?.extra_fields?.age || '');
  const [animalCollar, setAnimalCollar] = useState(editItem?.collar || editItem?.extra_fields?.collar || '');
  
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // Reward
  const [offerReward, setOfferReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);
  const [mapLocationDetails, setMapLocationDetails] = useState(editItem?.extra_fields?.location_details || null);
  const [mapAddressText, setMapAddressText] = useState(
    editItem?.extra_fields?.location_details?.text
      || (editItem?.extra_fields?.location_details
        ? [
            editItem.extra_fields.location_details.street,
            editItem.extra_fields.location_details.number,
            editItem.extra_fields.location_details.district,
            editItem.extra_fields.location_details.city,
            editItem.extra_fields.location_details.state,
          ].filter(Boolean).join(', ')
        : '')
  );

  // Modal para perguntar se encontrou o item
  const [foundModalVisible, setFoundModalVisible] = useState(false);
  const [foundModalTitle, setFoundModalTitle] = useState('');
  const [foundModalMessage, setFoundModalMessage] = useState('');
  const [foundModalItemId, setFoundModalItemId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const renderLocationAndRewardSection = () => (
    <View>
      <Text style={styles.label}>Localização</Text>
      <Text style={styles.locationHint}>
        Escolha no mapa onde o pet foi {status === 'lost' ? 'perdido' : 'encontrado'}.
      </Text>
      {renderMapLocationButton()}

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
        transparent
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
              markedDates={{ [date]: { selected: true, selectedColor: '#2563EB', selectedTextColor: '#FFFFFF' } }}
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
            <Button title="Confirmar data" onPress={() => setShowDatePicker(false)} style={styles.modalButton} />
          </View>
        </View>
      </Modal>

      {(itemType !== 'animal' || status !== 'found') && (
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
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderMapLocationButton = () => (
    <>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => setMapModalVisible(true)}
      >
        <Text style={styles.mapButtonText}>
          {mapLocation ? 'Alterar localização no mapa' : 'Escolher localização no mapa'}
        </Text>
      </TouchableOpacity>
      {mapLocation && (
        <Text style={styles.mapSelectedText}>
          Ponto selecionado: {mapLocation.latitude.toFixed(5)}, {mapLocation.longitude.toFixed(5)}
        </Text>
      )}
      {mapAddressText && (
        <View style={styles.addressEditorContainer}>
          <Text style={styles.label}>Endereço informado</Text>
          <TextInput
            style={styles.addressInput}
            value={mapAddressText}
            onChangeText={setMapAddressText}
            placeholder="Edite o endereço gerado pelo mapa"
            multiline
            textAlignVertical="top"
          />
        </View>
      )}
    </>
  );

  const renderMapLocationPicker = () => (
    <MapLocationPicker
      visible={mapModalVisible}
      initialLocation={mapLocation}
      onClose={() => setMapModalVisible(false)}
      onConfirm={({ coordinate, address }) => {
        setMapLocation(coordinate);
        setCity(address?.city || '');
        const region = String(address?.region || '').trim();
        const normalizedRegion = region.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        setState(states.includes(region) ? region : (BRAZIL_REGION_TO_UF[normalizedRegion] || ''));
        setNeighborhood(address?.district || address?.subregion || '');
        const nextLocationDetails = address ? {
          street: address.street || address.name || '',
          number: address.name && /^\d+$/.test(String(address.name)) ? address.name : address.houseNumber || '',
          district: address.district || address.subregion || '',
          city: address.city || address.subregion || '',
          state: region,
          postalCode: address.postalCode || '',
        } : null;
        setMapLocationDetails(nextLocationDetails);
        const nextAddressText = [
          nextLocationDetails?.street,
          nextLocationDetails?.number,
          nextLocationDetails?.district,
          nextLocationDetails?.city,
          nextLocationDetails?.state,
        ].filter(Boolean).join(', ');
        setMapAddressText(nextAddressText);
        setMapModalVisible(false);
      }}
    />
  );

  // Carregar dados antigos quando editar item
  useEffect(() => {
    if (editItem) {
      // Carregar fotos antigas
      if (editItem.item_photos && editItem.item_photos.length > 0) {
        const oldPhotos = editItem.item_photos.map(photo => ({
          uri: photo.url,
          type: 'image/jpeg',
          name: photo.url.split('/').pop(),
          id: photo.id,
        }));
        setPhotos(oldPhotos);
      }
      // Carregar todos os campos
      if (editItem.title) setTitle(editItem.title);
      if (editItem.description) setDescription(editItem.description);
      if (editItem.state) setState(editItem.state);
      if (editItem.city) setCity(editItem.city);
      if (editItem.neighborhood) setNeighborhood(editItem.neighborhood);
      if (editItem.latitude && editItem.longitude) {
        setMapLocation({ latitude: editItem.latitude, longitude: editItem.longitude });
      }
      
      // Carregar campos das colunas diretas OU extra_fields
      if (typeof editItem.brand !== 'undefined') setBrand(editItem.brand);
      else if (editItem.extra_fields && typeof editItem.extra_fields.brand !== 'undefined') setBrand(editItem.extra_fields.brand);
      
      if (typeof editItem.color !== 'undefined') setColor(editItem.color);
      else if (editItem.extra_fields && typeof editItem.extra_fields.color !== 'undefined') setColor(editItem.extra_fields.color);
      
      if (typeof editItem.serial_number !== 'undefined') setSerialNumber(editItem.serial_number);
      else if (editItem.extra_fields && typeof editItem.extra_fields.serial_number !== 'undefined') setSerialNumber(editItem.extra_fields.serial_number);
      
      if (typeof editItem.species !== 'undefined') setAnimalSpecies(editItem.species);
      else if (editItem.extra_fields && typeof editItem.extra_fields.species !== 'undefined') setAnimalSpecies(editItem.extra_fields.species);
      
      if (typeof editItem.breed !== 'undefined') setAnimalBreed(editItem.breed);
      else if (editItem.extra_fields && typeof editItem.extra_fields.breed !== 'undefined') setAnimalBreed(editItem.extra_fields.breed);
      
      if (typeof editItem.size !== 'undefined') setAnimalSize(editItem.size);
      else if (editItem.extra_fields && typeof editItem.extra_fields.size !== 'undefined') setAnimalSize(editItem.extra_fields.size);
      
      if (typeof editItem.age !== 'undefined') setAnimalAge(editItem.age);
      else if (editItem.extra_fields && typeof editItem.extra_fields.age !== 'undefined') setAnimalAge(editItem.extra_fields.age);
      
      if (typeof editItem.collar !== 'undefined') setAnimalCollar(editItem.collar);
      else if (editItem.extra_fields && typeof editItem.extra_fields.collar !== 'undefined') setAnimalCollar(editItem.extra_fields.collar);
      
    } else {
      if (userProfile?.state) setState(userProfile.state);
      if (userProfile?.city) setCity(userProfile.city);
    }
  }, [editItem, userProfile]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Faça login para registrar um pet</Text>
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
    if (day?.dateString) setDate(day.dateString);
  };

  const buildAutoTitle = () => {
    if (itemType !== 'animal') {
      return 'Animal';
    }

    const species = normalizeSpeciesValue(animalSpecies) || 'Animal';
    const statusLabel = status === 'lost' ? 'perdido' : 'encontrado';
    const colorLabel = color?.trim().toLowerCase() || 'cor não informada';
    const location = neighborhood || city || 'localização selecionada no mapa';

    return `${species}, ${colorLabel}, ${statusLabel}, em ${location.trim()}`;
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const MAX_PHOTOS = 6;

  const pickAndCropImage = async () => {
    try {
      if (photos.length >= MAX_PHOTOS) {
        Alert.alert('Limite de fotos atingido', `Você pode adicionar no máximo ${MAX_PHOTOS} fotos.`);
        return;
      }

      console.log('[pickAndCropImage] Requesting permissions...');
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (libraryStatus !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para selecionar fotos');
        return;
      }

      console.log('[pickAndCropImage] Launching image picker with cropping...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const optimizedPhoto = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const photo = {
          uri: optimizedPhoto.uri,
          type: 'image/jpeg',
          name: `${Date.now()}_${asset.fileName || 'pet.jpg'}`,
        };

        if (itemType === 'pet') {
          const validation = await validatePetPhoto({ imageUri: photo.uri });
          if (!validation.isPet) {
            Alert.alert(
              'Foto não permitida',
              'Não foi possível validar essa imagem. Tente enviar uma foto mais nítida, bem iluminada e com o animal visível, como um cão, gato, bovino ou outro animal.'
            );
            return;
          }
        }

        setPhotos((previousPhotos) => [...previousPhotos, photo]);
        Alert.alert('Sucesso', 'Foto adicionada e recortada com sucesso!');
      }
    } catch (error) {
      console.error('[RegisterItem] Falha ao selecionar foto com corte:', error);
      Alert.alert('Erro', 'Falha ao selecionar foto: ' + error.message);
    }
  };

  const reCropPhoto = async (index) => {
    try {
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryStatus !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para cortar fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const optimizedPhoto = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const newPhoto = {
          uri: optimizedPhoto.uri,
          type: 'image/jpeg',
          name: `${Date.now()}_${asset.fileName || 'pet_cropped.jpg'}`,
        };

        if (itemType === 'pet') {
          const validation = await validatePetPhoto({ imageUri: newPhoto.uri });
          if (!validation.isPet) {
            Alert.alert(
              'Foto não permitida',
              'Não foi possível validar essa imagem. Tente enviar uma foto mais nítida, bem iluminada e com o animal visível.'
            );
            return;
          }
        }

        const updated = [...photos];
        updated[index] = newPhoto;
        setPhotos(updated);
        Alert.alert('Sucesso', 'Foto atualizada e recortada com sucesso!');
      }
    } catch (error) {
      console.error('[RegisterItem] Erro ao recortar foto:', error);
      Alert.alert('Erro', 'Falha ao recortar foto: ' + error.message);
    }
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
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
      });

      console.log('[pickImage] Result:', result);

      if (!result.canceled && result.assets) {
        console.log('[pickImage] Selected photos:', result.assets.length);
        const newPhotos = [];

        for (const asset of result.assets) {
          const optimizedPhoto = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 600 } }],
            { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG }
          );
          const photo = {
            uri: optimizedPhoto.uri,
            type: 'image/jpeg',
            name: `${Date.now()}_${asset.fileName || 'pet.jpg'}`,
          };

          const validation = await validatePetPhoto({ imageUri: photo.uri });
          if (!validation.isPet) {
            Alert.alert(
              'Foto não permitida',
              'Não foi possível validar essa imagem. Tente enviar uma foto mais nítida, bem iluminada e com o animal visível, como um cão, gato, bovino ou outro animal.'
            );
            return;
          }

          newPhotos.push(photo);
        }

        setPhotos((previousPhotos) => [...previousPhotos, ...newPhotos]);
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
      const petValidation = await validatePetPhoto({ imageUri: primaryPhoto.uri });
      if (!petValidation.isPet) {
        Alert.alert(
          'Foto não permitida',
          'Não foi possível validar essa imagem. Envie uma foto mais nítida e com o animal bem visível, em boa iluminação, para continuar.'
        );
        return;
      }
      const suggestions = await analyzeItemWithVision({
        imageUri: primaryPhoto.uri,
        itemType,
        status,
      });

      console.log('[RegisterItem] Sugestões recebidas da IA:', suggestions);

      if (itemType === 'animal') {
        if (suggestions.species) setAnimalSpecies(normalizeSpeciesValue(suggestions.species));
        if (suggestions.breed) setAnimalBreed(suggestions.breed);
        if (suggestions.size) setAnimalSize(normalizeOptionValue(suggestions.size, PET_SIZE_OPTIONS));
        if (suggestions.age) setAnimalAge(normalizeOptionValue(suggestions.age, PET_AGE_OPTIONS));
        if (suggestions.collar) setAnimalCollar(suggestions.collar);
      }

      if (suggestions.title) setTitle(suggestions.title);
      if (suggestions.description) setDescription(suggestions.description);
      if (suggestions.brand) setBrand(suggestions.brand);
      if (suggestions.color) setColor(normalizeColorValue(suggestions.color));
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
      setError('Selecione o tipo do pet');
      return false;
    }

    if (itemType === 'animal' && (!animalSpecies || !animalSpecies.trim())) {
      setError('Selecione a espécie do animal');
      return false;
    }

    if (editItem) {
      if (!date.trim() && !editItem.date) {
        setError('Selecione a data');
        return false;
      }
      return true;
    }

    if (!date.trim()) {
      setError('Selecione a data');
      return false;
    }
    if (!mapLocation?.latitude || !mapLocation?.longitude) {
      setError('Escolha a localização do pet no mapa');
      return false;
    }
    if (!status) {
      setError('Selecione se perdeu ou encontrou');
      return false;
    }

    return true;
  };

  const goToHomeAfterPublish = () => {
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
      });
    } catch (error) {
      console.warn('[RegisterItem] Falha ao resetar rota após publicar:', error.message);
      navigation.goBack();
    }
  };

  const handleFoundItemConfirm = async () => {
    if (!foundModalItemId) return;
    setDeleting(true);
    try {
      await itemsService.deleteItem(foundModalItemId);
      setFoundModalVisible(false);
      Alert.alert('Publicação excluída', 'Sua publicação foi removida com sucesso.');
      goToHomeAfterPublish();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível excluir a publicação. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateFields()) return;

    if (photos.length > 0) {
      const validation = await validatePetPhoto({ imageUri: photos[0].uri });
      if (!validation.isPet) {
        setError('A imagem precisa ser de um animal visível.');
        Alert.alert(
          'Foto não permitida',
          'Não foi possível validar essa imagem. Tente enviar uma foto mais nítida, com o animal bem visível e em boa iluminação.'
        );
        return;
      }
    }

    setLoading(true);

    try {
      let currentTitle = itemType === 'animal' ? buildAutoTitle() : (title || buildAutoTitle());
      if (!currentTitle || currentTitle.trim() === '') {
        currentTitle = buildAutoTitle() || 'Animal';
      }

      const toNull = v => (typeof v === 'string' && v.trim() === '' ? null : v);
      const normalizedAddressText = (mapAddressText || [
        mapLocationDetails?.street,
        mapLocationDetails?.number,
        mapLocationDetails?.district,
        mapLocationDetails?.city,
        mapLocationDetails?.state,
      ].filter(Boolean).join(', ')).trim();

      const exactLocationDetails = {
        street: mapLocationDetails?.street || '',
        number: mapLocationDetails?.number || '',
        district: mapLocationDetails?.district || '',
        city: mapLocationDetails?.city || city || '',
        state: mapLocationDetails?.state || state || '',
        postalCode: mapLocationDetails?.postalCode || '',
        text: normalizedAddressText || null,
      };

      const itemData = {
        title: toNull(currentTitle) || editItem?.title || 'Animal',
        description: toNull(description) || editItem?.description,
        state: toNull(mapLocationDetails?.state) || toNull(state) || editItem?.state || null,
        city: toNull(mapLocationDetails?.city) || toNull(city) || editItem?.city || null,
        neighborhood: toNull(mapLocationDetails?.district) || toNull(neighborhood) || editItem?.neighborhood || null,
        latitude: mapLocation?.latitude ?? editItem?.latitude ?? null,
        longitude: mapLocation?.longitude ?? editItem?.longitude ?? null,
        street: toNull(mapLocationDetails?.street) || editItem?.street || null,
        house_number: toNull(mapLocationDetails?.number) || editItem?.house_number || null,
        postal_code: toNull(mapLocationDetails?.postalCode) || editItem?.postal_code || null,
        address: toNull(normalizedAddressText) || editItem?.address || null,
        status: toNull(status) || editItem?.status || 'lost',
        category: toNull(itemType) || editItem?.category || null,
        item_type: toNull(itemType) || editItem?.item_type || null,
        date: date || editItem?.date || new Date().toISOString().split('T')[0],
        brand: toNull(brand),
        color: toNull(color),
        serial_number: toNull(serialNumber),
        species: toNull(animalSpecies),
        breed: toNull(animalBreed),
        size: toNull(animalSize),
        age: toNull(animalAge),
        collar: toNull(animalCollar),
        // Adicionar extra_fields para dados flexíveis
        extra_fields: {
          brand: toNull(brand),
          color: toNull(color),
          serial_number: toNull(serialNumber),
          species: toNull(animalSpecies),
          breed: toNull(animalBreed),
          size: toNull(animalSize),
          age: toNull(animalAge),
          collar: toNull(animalCollar),
          location_details: exactLocationDetails,
        },
      };

      if (!editItem) {
        itemData.owner_id = user.id;
      }

      let resultItem;
      if (editItem) {
        resultItem = await itemsService.updateItem(editItem.id, itemData);

        if (offerReward && (rewardAmount || rewardDescription)) {
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

        if (editItem.item_photos && editItem.item_photos.length > 0) {
          const remainingOldPhotoIds = photos
            .filter(photo => photo.id)
            .map(photo => photo.id);
          const removedOldPhotos = editItem.item_photos.filter(photo => !remainingOldPhotoIds.includes(photo.id));
          for (const removedPhoto of removedOldPhotos) {
            try {
              await itemsService.removeItemPhoto(removedPhoto.id, removedPhoto.url);
            } catch (err) {
              console.error('[RegisterItem] Erro ao remover foto antiga:', err);
            }
          }
        }

        if (photos && photos.length > 0) {
          for (const photo of photos) {
            if (!photo.id && photo.uri && (photo.uri.startsWith('file://') || photo.uri.startsWith('content://'))) {
              try {
                await itemsService.saveItemPhoto(editItem.id, photo);
              } catch (err) {
                console.error('[RegisterItem] Erro ao processar foto:', err);
              }
            }
          }
        }

        Alert.alert('Sucesso', 'Pet atualizado com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        resultItem = await itemsService.registerItem(itemData, photos);

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

        Alert.alert('Sucesso', 'Pet registrado com sucesso!', [
          {
            text: 'Ir para Home',
            onPress: () => {
              goToHomeAfterPublish();
              if (status === 'lost') {
                setTimeout(() => {
                  setFoundModalTitle('Você encontrou seu pet?');
                  setFoundModalMessage('Você acabou de registrar que perdeu um pet. Caso encontre, pode excluir a publicação. Você já encontrou seu pet?');
                  setFoundModalItemId(resultItem.id);
                  setFoundModalVisible(true);
                }, 1000);
              }
            },
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao registrar pet';
      console.error('Erro ao registrar:', err);
      setError(errorMsg);
      Alert.alert('Erro', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Modal de confirmação se encontrou o item
  const renderFoundModal = () => (
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
                goToHomeAfterPublish();
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
  );

  // Step 1: Selecionar tipo
  if (step === 1 && !itemType) {
    if (editItem && editItem.category) {
      const normalized = normalizeCategory(editItem.category);
      return (
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Pet</Text>
            <Text style={styles.subtitle}>Tipo: {ITEM_TYPES[normalized]?.label || normalized || editItem.category}</Text>
            <Text style={{ color: '#4B5563', marginTop: 16, fontWeight: 'bold' }}>
              Você pode ajustar detalhes do pet antes de salvar.
            </Text>
          </View>
          <Button title="Avançar" onPress={() => {
            setItemType(normalized);
            setStep(2);
          }} />
        </ScrollView>
      );
    }
    
    const typeOptions = [
      {
        key: 'animal',
        label: 'Pet',
        desc: 'Cães, gatos, aves e outros animais',
        color: '#F3E8FF',
        icon: '🐾'
      }
    ];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>Registrar</Text>
          <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>Seu pet perdido ou encontrado</Text>
        </View>
        <View style={{ gap: 18, marginHorizontal: 12, marginBottom: 32 }}>
          {typeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelectType(opt.key)}
              style={{ borderRadius: 18, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
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

  // Step 2: Detalhes do pet
  if (step === 2) {
    const config = ITEM_TYPES[itemType];
    if (!config) {
      if (ITEM_TYPES['outro']) {
        setItemType('outro');
        return null;
      }
      return (
        <ScrollView style={styles.container}>
          <Card style={styles.card}>
            <Text style={styles.title}>Erro ao carregar o pet</Text>
            <Text>Por favor, tente iniciar o cadastro do pet novamente.</Text>
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
                    onPress={() => {
                      setStatus('found');
                      setOfferReward(false);
                      setRewardAmount('');
                    }}
                  >
                    <Text style={[
                      styles.statusText,
                      status === 'found' && styles.statusTextActive,
                    ]}>
                      Encontrei
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {photos.length < MAX_PHOTOS ? (
                <TouchableOpacity
                  style={[styles.uploadButton, { marginTop: 8 }]}
                  onPress={pickAndCropImage}
                >
                  <Text style={styles.uploadButtonText}>+ Adicionar Foto ({photos.length}/{MAX_PHOTOS})</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadButton, { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6', paddingVertical: 14 }]}>
                  <Text style={[styles.uploadButtonText, { color: '#9CA3AF', fontSize: 14 }]}>Limite de {MAX_PHOTOS} fotos atingido</Text>
                </View>
              )}
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
                  <Text style={styles.photosTitle}>Fotos Selecionadas ({photos.length}/{MAX_PHOTOS})</Text>
                  <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                      <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photo}
                          onError={(error) => console.warn('[RegisterItem] Falha ao exibir prévia:', error.nativeEvent.error)}
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Text style={styles.removePhotoText}>✕</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderRadius: 6,
                            paddingVertical: 3,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 3,
                          }}
                          onPress={() => reCropPhoto(index)}
                        >
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✂️ Ajustar</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <SelectionChips label="Espécie *" options={PET_SPECIES_CHIPS.map((option) => option.value)} value={animalSpecies} onChange={setAnimalSpecies} />
              <SelectionChips
                label="Cor *"
                options={PET_COLOR_OPTIONS}
                value={color}
                multiSelect
                onChange={(option) => {
                  const selectedColors = getSelectedColorOptions(color);
                  const nextColors = selectedColors.includes(option)
                    ? selectedColors.filter((selectedColor) => selectedColor !== option)
                    : [...selectedColors, option];
                  setColor(nextColors.join(' com '));
                }}
              />
              <SelectionChips label="Porte" options={PET_SIZE_OPTIONS} value={animalSize} onChange={setAnimalSize} />
              <SelectionChips label="Idade" options={PET_AGE_OPTIONS} value={animalAge} onChange={setAnimalAge} />
              <SelectionChips label="Raça" options={PET_BREED_OPTIONS} value={animalBreed} onChange={setAnimalBreed} />
              <Input
                label="Raça (opcional)"
                placeholder="Digite a raça do pet"
                value={animalBreed}
                onChangeText={setAnimalBreed}
                style={styles.input}
              />
              <Input
                label="Descrição"
                placeholder="Descreva detalhes importantes..."
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={4}
                style={styles.input}
              />
              {renderLocationAndRewardSection()}

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          {renderMapLocationPicker()}
          {renderFoundModal()}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F9FAFB', padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
            <Button
              title={loading ? 'Publicando...' : 'Publicar'}
              onPress={handlePublish}
              disabled={loading}
            />
          </View>
        </View>
      );
    }

    // Outros tipos: formulário dinâmico
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 180 }}>
          <View>
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
                  onPress={() => {
                    setStatus('found');
                    setOfferReward(false);
                    setRewardAmount('');
                  }}
                >
                  <Text style={[
                    styles.statusText,
                    status === 'found' && styles.statusTextActive,
                  ]}>
                    Encontrei
                  </Text>
                </TouchableOpacity>
              </View>
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
                {photos.length < MAX_PHOTOS ? (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickAndCropImage}
                  >
                    <Text style={styles.uploadButtonText}>+ Adicionar Foto ({photos.length}/{MAX_PHOTOS})</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.uploadButton, { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6', paddingVertical: 14 }]}>
                    <Text style={[styles.uploadButtonText, { color: '#9CA3AF', fontSize: 14 }]}>Limite de {MAX_PHOTOS} fotos atingido</Text>
                  </View>
                )}

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
                    <Text style={styles.photosTitle}>Fotos Selecionadas ({photos.length}/{MAX_PHOTOS})</Text>
                    <View style={styles.photoGrid}>
                      {photos.map((photo, index) => (
                        <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                          <Image
                            source={{ uri: photo.uri }}
                            style={styles.photo}
                            onError={(error) => console.warn('[RegisterItem] Falha ao exibir prévia:', error.nativeEvent.error)}
                          />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => removePhoto(index)}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              right: 4,
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              borderRadius: 6,
                              paddingVertical: 3,
                              alignItems: 'center',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              gap: 3,
                            }}
                            onPress={() => reCropPhoto(index)}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✂️ Ajustar</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {config.fields.required.concat(config.fields.optional)
              .filter(field => field !== 'title' && config.fieldLabels[field] && config.placeholders[field])
              .map((field) => {
                let value = '';
                let onChangeText = () => {};
                if (field === 'color') { value = color; onChangeText = setColor; }
                else if (field === 'description') {
                  return (
                    <Input
                      key={field}
                      label={config.fieldLabels[field] + (config.fields.required.includes(field) ? ' *' : '')}
                      placeholder={config.placeholders[field]}
                      value={description}
                      onChangeText={setDescription}
                      multiline={true}
                      numberOfLines={4}
                      style={styles.input}
                    />
                  );
                }
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
            {!config.fields.required.concat(config.fields.optional).includes('description') && (
              <Input
                label="Descrição (opcional)"
                placeholder="Descreva detalhes importantes..."
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={4}
                style={styles.input}
              />
            )}
            {renderLocationAndRewardSection()}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
        {renderMapLocationPicker()}
        {renderFoundModal()}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F9FAFB', padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
          <Button
            title={loading ? 'Publicando...' : 'Publicar'}
            onPress={handlePublish}
            disabled={loading}
          />
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
          <Text style={styles.locationHint}>
            Escolha no mapa onde o pet foi {status === 'lost' ? 'visto pela última vez' : 'encontrado'}.
          </Text>
          {renderMapLocationButton()}

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
                  title="Confirmar data"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </Modal>

          {(itemType !== 'animal' || status !== 'found') && (
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
                </>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
        {renderMapLocationPicker()}
        {renderFoundModal()}
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoItem: {
    width: '31%',
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
  selectionGroup: {
    marginBottom: 14,
  },
  selectionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  selectionChip: {
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  selectionChipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  selectionChipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionChipTextSelected: {
    color: '#4338CA',
  },
  mapButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapButtonText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  mapSelectedText: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  locationHint: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 12,
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
  addressEditorContainer: {
    marginBottom: 16,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    backgroundColor: '#FFFFFF',
  },
});

export default RegisterItemScreen;