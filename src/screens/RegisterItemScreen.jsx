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
import { MaterialIcons } from '@expo/vector-icons';
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
const PET_GENDER_OPTIONS = ['Macho', 'Fêmea', 'Não informado'];
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
  const initialStatus = editItem?.extra_fields?.is_direct_adoption ? 'adoption' : (editItem?.status || 'lost');
  const [status, setStatus] = useState(initialStatus);
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
  const [animalGender, setAnimalGender] = useState(editItem?.gender || editItem?.extra_fields?.gender || '');
  const [animalBreed, setAnimalBreed] = useState(editItem?.breed || editItem?.extra_fields?.breed || '');
  const [animalSize, setAnimalSize] = useState(editItem?.size || editItem?.extra_fields?.size || '');
  const [animalAge, setAnimalAge] = useState(editItem?.age || editItem?.extra_fields?.age || '');
  const [animalCollar, setAnimalCollar] = useState(editItem?.collar || editItem?.extra_fields?.collar || '');
  
  // Publicação em nome de terceiro
  const [isThirdPartyOwner, setIsThirdPartyOwner] = useState(
    Boolean(editItem?.extra_fields?.third_party_owner?.active)
  );
  const [thirdPartyName, setThirdPartyName] = useState(
    editItem?.extra_fields?.third_party_owner?.name || ''
  );
  const [thirdPartyPhone, setThirdPartyPhone] = useState(
    editItem?.extra_fields?.third_party_owner?.phone || ''
  );

  // Custódia e Adoção (quando status === 'found')
  const [foundCustody, setFoundCustody] = useState(
    editItem?.extra_fields?.found_custody || 'with_me' // 'with_me' | 'spotted'
  );
  const [adoptionIntent, setAdoptionIntent] = useState(
    Boolean(editItem?.extra_fields?.adoption_intent)
  );

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
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
        Escolha no mapa onde o animal foi {status === 'lost' ? 'perdido' : 'encontrado'}.
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

      {status === 'lost' && (
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

      {/* Seção de Publicação em nome de terceiro */}
      <View style={styles.thirdPartySection}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsThirdPartyOwner(!isThirdPartyOwner)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, isThirdPartyOwner && styles.checkboxChecked]}>
            {isThirdPartyOwner && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Estou publicando em nome de outra pessoa
          </Text>
        </TouchableOpacity>

        {isThirdPartyOwner && (
          <View style={styles.thirdPartyInputsBox}>
            <Text style={styles.thirdPartyHint}>
              Informe o nome e telefone do tutor/dono real para contato direto:
            </Text>
            <Input
              label="Nome do Tutor / Responsável *"
              placeholder="Ex: Dona Maria"
              value={thirdPartyName}
              onChangeText={setThirdPartyName}
              style={styles.input}
            />
            <Input
              label="Telefone / WhatsApp do Tutor *"
              placeholder="Ex: (53) 99999-8888"
              value={thirdPartyPhone}
              onChangeText={(text) => {
                const digits = String(text).replace(/\D/g, '').slice(0, 11);
                let formatted = digits;
                if (digits.length > 2 && digits.length <= 6) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                else if (digits.length > 6 && digits.length <= 10) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                else if (digits.length > 10) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                setThirdPartyPhone(formatted);
              }}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderMapLocationButton = () => (
    <>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => setMapModalVisible(true)}
      >
        <Text style={styles.mapButtonText}>
          {mapLocation ? '📍 Alterar localização no mapa' : '🗺️ Escolher localização no mapa'}
        </Text>
      </TouchableOpacity>
      {mapLocation && (
        <Text style={styles.mapSelectedText}>
          Ponto selecionado: {mapLocation.latitude.toFixed(5)}, {mapLocation.longitude.toFixed(5)}
        </Text>
      )}
      {mapLocation && (
        <View style={styles.addressFieldsContainer}>
          <Text style={[styles.label, { marginBottom: 8 }]}>Endereço no local (editável)</Text>
          
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 2.2 }}>
              <Text style={styles.smallInputLabel}>Rua / Logradouro</Text>
              <TextInput
                style={styles.singleLineInput}
                value={mapLocationDetails?.street || ''}
                onChangeText={(t) => {
                  const updated = { ...(mapLocationDetails || {}), street: t };
                  setMapLocationDetails(updated);
                  const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                  setMapAddressText(formatted);
                }}
                placeholder="Ex: Rua das Flores"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.smallInputLabel}>Nº da Casa</Text>
              <TextInput
                style={styles.singleLineInput}
                value={mapLocationDetails?.number || ''}
                onChangeText={(t) => {
                  const updated = { ...(mapLocationDetails || {}), number: t };
                  setMapLocationDetails(updated);
                  const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                  setMapAddressText(formatted);
                }}
                placeholder="Ex: 123"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.smallInputLabel}>Bairro</Text>
              <TextInput
                style={styles.singleLineInput}
                value={mapLocationDetails?.district || neighborhood || ''}
                onChangeText={(t) => {
                  setNeighborhood(t);
                  const updated = { ...(mapLocationDetails || {}), district: t };
                  setMapLocationDetails(updated);
                  const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                  setMapAddressText(formatted);
                }}
                placeholder="Ex: Centro"
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.smallInputLabel}>Cidade</Text>
              <TextInput
                style={styles.singleLineInput}
                value={city}
                onChangeText={(t) => {
                  setCity(t);
                  const updated = { ...(mapLocationDetails || {}), city: t };
                  setMapLocationDetails(updated);
                  const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                  setMapAddressText(formatted);
                }}
                placeholder="Ex: Pelotas"
              />
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={styles.smallInputLabel}>Estado</Text>
              <TextInput
                style={styles.singleLineInput}
                value={state}
                onChangeText={(t) => {
                  const upper = t.toUpperCase();
                  setState(upper);
                  const updated = { ...(mapLocationDetails || {}), state: upper };
                  setMapLocationDetails(updated);
                  const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                  setMapAddressText(formatted);
                }}
                placeholder="Ex: RS"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.addressEditorContainer}>
            <Text style={styles.smallInputLabel}>Endereço Completo</Text>
            <TextInput
              style={styles.addressInput}
              value={mapAddressText}
              onChangeText={setMapAddressText}
              placeholder="Edite o endereço gerado pelo mapa"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </>
  );

  const renderMapLocationPicker = () => (
    <MapLocationPicker
      visible={mapModalVisible}
      initialLocation={mapLocation}
      onClose={() => setMapModalVisible(false)}
      onConfirm={({ coordinate, address, addressDetails, addressText }) => {
        setMapLocation(coordinate);
        const resolvedCity = addressDetails?.city || address?.city || address?.subregion || '';
        const resolvedRegion = addressDetails?.state || address?.region || '';
        const resolvedDistrict = addressDetails?.district || address?.district || address?.subregion || '';
        
        setCity(resolvedCity);
        const normalizedRegion = resolvedRegion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        setState(states.includes(resolvedRegion) ? resolvedRegion : (BRAZIL_REGION_TO_UF[normalizedRegion] || resolvedRegion));
        setNeighborhood(resolvedDistrict);

        const details = addressDetails || {
          street: address?.street || address?.name || '',
          number: address?.houseNumber || (address?.name && /^\d+$/.test(String(address.name)) ? address.name : ''),
          district: resolvedDistrict,
          city: resolvedCity,
          state: resolvedRegion,
          postalCode: address?.postalCode || '',
          text: addressText || '',
        };
        setMapLocationDetails(details);
        setMapAddressText(addressText || details.text || [details.street, details.number, details.district, details.city, details.state].filter(Boolean).join(', '));
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
      
      if (typeof editItem.gender !== 'undefined') setAnimalGender(editItem.gender);
      else if (editItem.extra_fields && typeof editItem.extra_fields.gender !== 'undefined') setAnimalGender(editItem.extra_fields.gender);

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
          <Text style={styles.messageText}>Faça login para registrar um animal</Text>
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
      return 'Item';
    }

    const species = normalizeSpeciesValue(animalSpecies) || 'Animal';
    const isFemale = species.toLowerCase() === 'ave';
    let statusLabel = '';
    if (status === 'lost') {
      statusLabel = isFemale ? 'perdida' : 'perdido';
    } else if (status === 'adoption') {
      statusLabel = 'para adoção';
    } else {
      statusLabel = isFemale ? 'encontrada' : 'encontrado';
    }
    const colorLabel = color && color.trim() && color.trim().toLowerCase() !== 'cor não informada' ? color.trim().toLowerCase() : '';
    
    // Prioriza rua/praça selecionada, depois bairro/distrito, depois cidade
    const rawLoc = (
      mapLocationDetails?.street ||
      neighborhood ||
      mapLocationDetails?.district ||
      city ||
      mapLocationDetails?.city ||
      ''
    ).trim();

    const formatLocationPhrase = (loc) => {
      if (!loc) return '';
      const lower = loc.toLowerCase();
      if (/^(no|na|em|nos|nas|ao|à)\s+/i.test(loc)) return loc;
      if (/^(praça|praca|rua|avenida|av\.|alameda|travessa|vila|estrada|rodovia|cohab|praia|zona)\b/i.test(lower)) {
        return `na ${loc}`;
      }
      if (/^(centro|parque|bairro|jardim|porto|balneário|balneario|morro|largo|recanto|condomínio|condominio|loteamento|shopping)\b/i.test(lower) || lower === 'centro') {
        return `no ${loc}`;
      }
      return `em ${loc}`;
    };

    const locationPhrase = formatLocationPhrase(rawLoc);

    if (colorLabel && locationPhrase) {
      return `${species} ${colorLabel} ${statusLabel} ${locationPhrase}`.trim();
    }
    if (colorLabel && !locationPhrase) {
      return `${species} ${colorLabel} ${statusLabel}`.trim();
    }
    if (!colorLabel && locationPhrase) {
      return `${species} ${statusLabel} ${locationPhrase}`.trim();
    }
    return `${species} ${statusLabel}`.trim();
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Selecione a data';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
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



  const validateFields = () => {
    setError('');

    if (!user) {
      Alert.alert('Login necessário', 'Você precisa estar conectado para publicar um animal.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => navigation.navigate('Login') },
      ]);
      return false;
    }

    if (!itemType) {
      const msg = 'Selecione o tipo do animal';
      setError(msg);
      Alert.alert('Campo obrigatório', msg);
      return false;
    }

    if (itemType === 'animal' && (!animalSpecies || !animalSpecies.trim())) {
      const msg = 'Selecione a espécie do animal';
      setError(msg);
      Alert.alert('Campo obrigatório', msg);
      return false;
    }

    if (itemType === 'animal' && (!color || !color.trim())) {
      const msg = 'Selecione a cor do animal';
      setError(msg);
      Alert.alert('Campo obrigatório', msg);
      return false;
    }

    if (!photos || photos.length === 0) {
      const msg = 'Adicione pelo menos uma foto do animal para facilitar a identificação pela comunidade.';
      setError(msg);
      Alert.alert('Foto obrigatória', msg);
      return false;
    }

    if (editItem) {
      if (!date.trim() && !editItem.date) {
        const msg = 'Selecione a data';
        setError(msg);
        Alert.alert('Campo obrigatório', msg);
        return false;
      }
      return true;
    }

    if (!date.trim()) {
      const msg = 'Selecione a data do evento';
      setError(msg);
      Alert.alert('Campo obrigatório', msg);
      return false;
    }

    if (!mapLocation?.latitude || !mapLocation?.longitude) {
      const msg = 'Toque em "Definir Local no Mapa" para escolher a localização do animal.';
      setError(msg);
      Alert.alert('Localização necessária', msg);
      return false;
    }

    if (!status) {
      const msg = 'Selecione o objetivo da publicação (Perdi, Encontrei ou Para Adoção)';
      setError(msg);
      Alert.alert('Campo obrigatório', msg);
      return false;
    }

    if (isThirdPartyOwner) {
      if (!thirdPartyName || !thirdPartyName.trim()) {
        const msg = 'Informe o nome do tutor/responsável';
        setError(msg);
        Alert.alert('Campo obrigatório', msg);
        return false;
      }
      if (!thirdPartyPhone || !thirdPartyPhone.trim()) {
        const msg = 'Informe o telefone de contato do tutor';
        setError(msg);
        Alert.alert('Campo obrigatório', msg);
        return false;
      }
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
    console.log('[RegisterItem] handlePublish acionado! Status:', status, 'ItemType:', itemType, 'Fotos:', photos.length);
    if (!validateFields()) {
      console.log('[RegisterItem] Falha na validação dos campos.');
      return;
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

      const isDirectAdoption = status === 'adoption';
      const effectiveStatus = isDirectAdoption ? 'found' : status;

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
        status: toNull(effectiveStatus) || editItem?.status || 'lost',
        category: toNull(itemType) || editItem?.category || null,
        item_type: toNull(itemType) || editItem?.item_type || null,
        date: date || editItem?.date || new Date().toISOString().split('T')[0],
        brand: toNull(brand),
        color: toNull(color),
        serial_number: toNull(serialNumber),
        species: toNull(animalSpecies),
        gender: toNull(animalGender),
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
          gender: toNull(animalGender),
          breed: toNull(animalBreed),
          size: toNull(animalSize),
          age: toNull(animalAge),
          collar: toNull(animalCollar),
          is_direct_adoption: isDirectAdoption,
          found_custody: status === 'found' ? foundCustody : (isDirectAdoption ? 'with_me' : null),
          adoption_intent: status === 'found' && foundCustody === 'with_me' ? Boolean(adoptionIntent) : false,
          available_for_adoption: isDirectAdoption ? true : (editItem?.extra_fields?.available_for_adoption || false),
          location_details: exactLocationDetails,
          third_party_owner: isThirdPartyOwner && (thirdPartyName.trim() || thirdPartyPhone.trim()) ? {
            active: true,
            name: thirdPartyName.trim(),
            phone: thirdPartyPhone.trim(),
          } : null,
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

        if (status === 'lost' && offerReward && (rewardAmount || rewardDescription)) {
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

        Alert.alert('Sucesso', 'Animal registrado com sucesso!', [
          {
            text: 'Ir para Home',
            onPress: () => {
              goToHomeAfterPublish();
            },
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao registrar animal';
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
            <Text style={styles.title}>Editar Animal</Text>
            <Text style={styles.subtitle}>Tipo: {ITEM_TYPES[normalized]?.label || normalized || editItem.category}</Text>
            <Text style={{ color: '#4B5563', marginTop: 16, fontWeight: 'bold' }}>
              Você pode ajustar detalhes do animal antes de salvar.
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
        label: 'Animal',
        desc: 'Cães, gatos, aves, bovinos, cavalos e outros animais',
        color: '#EFF6FF',
        icon: '🐾'
      }
    ];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>Registrar</Text>
          <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>Seu animal perdido ou encontrado</Text>
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

  // Step 2: Detalhes do animal
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
            <Text style={styles.title}>Erro ao carregar o animal</Text>
            <Text>Por favor, tente iniciar o cadastro do animal novamente.</Text>
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
          <ScrollView
            style={{ flex: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 180 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <View style={styles.statusContainer}>
                <Text style={styles.label}>Qual é o objetivo desta publicação? *</Text>
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
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'adoption' && [styles.statusButtonActive, { backgroundColor: '#DB2777', borderColor: '#DB2777' }],
                    ]}
                    onPress={() => {
                      setStatus('adoption');
                      setOfferReward(false);
                      setRewardAmount('');
                    }}
                  >
                    <Text style={[
                      styles.statusText,
                      status === 'adoption' && styles.statusTextActive,
                    ]}>
                      Para Adoção
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Informação sobre Publicação Direta para Adoção */}
              {status === 'adoption' && (
                <View style={{ backgroundColor: '#FDF2F8', borderWidth: 1.5, borderColor: '#F472B6', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                    <MaterialIcons name="favorite" size={18} color="#DB2777" />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#9D174D' }}>
                      Adoção Imediata (Pet sem Tutor Conhecido)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: '#BE185D' }}>
                    Utilize esta opção para doar ou cadastrar animais resgatados, ninhadas ou pets de abrigo que não possuem dono prévio. O anúncio entrará diretamente no feed de adoção.
                  </Text>
                </View>
              )}

              {/* Opções de Custódia e Adoção Futura para Pet Encontrado */}
              {status === 'found' && (
                <View style={styles.custodySection}>
                  <Text style={styles.label}>Onde o animal está agora? *</Text>
                  <View style={styles.custodyOptionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.custodyOptionCard,
                        foundCustody === 'with_me' && styles.custodyOptionCardActive,
                      ]}
                      onPress={() => setFoundCustody('with_me')}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.custodyIconCircle, foundCustody === 'with_me' && styles.custodyIconCircleActive]}>
                        <MaterialIcons
                          name="home"
                          size={20}
                          color={foundCustody === 'with_me' ? '#FFFFFF' : '#2563EB'}
                        />
                      </View>
                      <Text style={[styles.custodyOptionTitle, foundCustody === 'with_me' && styles.custodyOptionTitleActive]}>
                        Estou com ele
                      </Text>
                      <Text style={styles.custodyOptionSub}>
                        Acolhido em lar temporário / minha casa
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.custodyOptionCard,
                        foundCustody === 'spotted' && styles.custodyOptionCardActive,
                      ]}
                      onPress={() => {
                        setFoundCustody('spotted');
                        setAdoptionIntent(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.custodyIconCircle, foundCustody === 'spotted' && styles.custodyIconCircleActive]}>
                        <MaterialIcons
                          name="visibility"
                          size={20}
                          color={foundCustody === 'spotted' ? '#FFFFFF' : '#D97706'}
                        />
                      </View>
                      <Text style={[styles.custodyOptionTitle, foundCustody === 'spotted' && styles.custodyOptionTitleActive]}>
                        Apenas vi o animal
                      </Text>
                      <Text style={styles.custodyOptionSub}>
                        Avistado na rua / sem recolhimento
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Opção de Intenção de Adoção (após período mínimo de 7 dias de busca pelo tutor) */}
                  {foundCustody === 'with_me' && (
                    <TouchableOpacity
                      style={[
                        styles.adoptionToggleCard,
                        adoptionIntent && styles.adoptionToggleCardActive,
                      ]}
                      onPress={() => setAdoptionIntent((prev) => !prev)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.adoptionToggleLeft}>
                        <View style={[styles.adoptionIconBadge, adoptionIntent && styles.adoptionIconBadgeActive]}>
                          <MaterialIcons
                            name="favorite"
                            size={18}
                            color={adoptionIntent ? '#FFFFFF' : '#E11D48'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adoptionToggleTitle}>
                            Disponibilizar para adoção caso o dono não apareça
                          </Text>
                          <Text style={styles.adoptionToggleSubtitle}>
                            ⏳ Janela obrigatória de 7 dias: O animal ficará listado como "Encontrado" durante a primeira semana de buscas. Se o tutor não for localizado após 1 semana, a adoção responsável será liberada.
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.customCheckbox, adoptionIntent && styles.customCheckboxChecked]}>
                        {adoptionIntent && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {photos.length < MAX_PHOTOS ? (
                <TouchableOpacity
                  style={[styles.uploadButton, { marginTop: 8 }]}
                  onPress={pickAndCropImage}
                >
                  <Text style={styles.uploadButtonText}>+ Adicionar Foto * ({photos.length}/{MAX_PHOTOS})</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadButton, { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6', paddingVertical: 14 }]}>
                  <Text style={[styles.uploadButtonText, { color: '#9CA3AF', fontSize: 14 }]}>Limite de {MAX_PHOTOS} fotos atingido</Text>
                </View>
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
              <SelectionChips label="Sexo / Gênero" options={PET_GENDER_OPTIONS} value={animalGender} onChange={setAnimalGender} />
              <SelectionChips label="Porte" options={PET_SIZE_OPTIONS} value={animalSize} onChange={setAnimalSize} />
              <SelectionChips label="Idade" options={PET_AGE_OPTIONS} value={animalAge} onChange={setAnimalAge} />
              <SelectionChips label="Raça" options={PET_BREED_OPTIONS} value={animalBreed} onChange={setAnimalBreed} />
              <Input
                label="Raça (opcional)"
                placeholder="Digite a raça do animal"
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
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F9FAFB', padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: '#E5E7EB', zIndex: 100, elevation: 10 }}>
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
            Escolha no mapa onde o animal foi {status === 'lost' ? 'visto pela última vez' : 'encontrado'}.
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

          {status === 'lost' && (
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
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  // Estilos de Custódia e Adoção
  custodySection: {
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  custodyOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  custodyOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  custodyOptionCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  custodyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  custodyIconCircleActive: {
    backgroundColor: '#2563EB',
  },
  custodyOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  custodyOptionTitleActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  custodyOptionSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  adoptionToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  adoptionToggleCardActive: {
    backgroundColor: '#FDF2F8',
    borderColor: '#DB2777',
  },
  adoptionToggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  adoptionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  adoptionIconBadgeActive: {
    backgroundColor: '#DB2777',
  },
  adoptionToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9F1239',
    marginBottom: 2,
  },
  adoptionToggleSubtitle: {
    fontSize: 11.5,
    color: '#BE123C',
    lineHeight: 15,
  },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FDA4AF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCheckboxChecked: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
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
    color: '#2563EB',
  },
  aiButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563EB',
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
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  selectionChipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionChipTextSelected: {
    color: '#1D4ED8',
  },
  mapButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapButtonText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  locationHint: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 12,
  },
  rewardSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  thirdPartySection: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  thirdPartyInputsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  thirdPartyHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
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
  addressEditorContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  addressFieldsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  smallInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  singleLineInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    minHeight: 50,
    backgroundColor: '#F9FAFB',
    fontSize: 13,
    color: '#374151',
  },
});

export default RegisterItemScreen;