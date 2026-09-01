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
import { useTheme } from '../contexts/ThemeContext';
import * as itemsService from '../services/items';
import * as sightingsService from '../services/sightings';
import * as rewardsService from '../services/rewards';
import { broadcastLostPetAlertToNearbyUsers } from '../services/pushNotifications';
import Button from '../components/Button';
import Input from '../components/Input';
import MapLocationPicker from '../components/MapLocationPicker';
import { states } from '../lib/br-locations';
import Card from '../components/Card';
import COLORS from '../constants/theme';

const PET_SPECIES_OPTIONS = [
  { label: 'Selecione a espécie', value: '' },
  { label: 'Cachorro', value: 'Cachorro' },
  { label: 'Gato', value: 'Gato' },
  { label: 'Bovino', value: 'Bovino' },
  { label: 'Ave', value: 'Ave' },
  { label: 'Cavalo', value: 'Cavalo' },
  { label: 'Outro', value: 'Outro' },
];

const STANDARD_PET_SPECIES = ['Cachorro', 'Gato', 'Bovino', 'Ave', 'Cavalo'];
const PET_SPECIES_CHIPS = PET_SPECIES_OPTIONS.filter((option) => option.value);
const PET_COLOR_OPTIONS = ['Preto', 'Branco', 'Marrom', 'Laranja', 'Cinza', 'Amarelo', 'Dourado', 'Caramelo'];
const PET_SIZE_OPTIONS = ['Pequeno', 'Médio', 'Grande', 'Gigante'];
const PET_GENDER_OPTIONS = ['Macho', 'Fêmea', 'Não informado'];
const PET_AGE_OPTIONS = ['Filhote', 'Adulto', 'Idoso', 'Não informado'];
const PET_BREED_OPTIONS = ['Sem raça definida'];
const PET_TEMPERAMENT_OPTIONS = [
  '😇 Dócil',
  '🎾 Brincalhão',
  '🛋️ Calmo / Tranquilo',
  '💖 Muito Carinhoso',
  '👶 Bom com Crianças',
  '🐱 Convive com Gatos',
  '🐶 Convive com Cães',
  '🦮 Obediente',
  '💉 Vacinado',
  '🪱 Vermifugado',
  '🏡 Adaptado a Apartamento',
  '⚡ Enérgico / Ativo',
];
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

const SelectionChips = ({ label, options, value, onChange, multiSelect = false }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.selectionGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.selectionChips}>
        {options.map((option) => {
          const selected = multiSelect
            ? getSelectedColorOptions(value).includes(option)
            : String(value || '').toLowerCase() === option.toLowerCase();
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.selectionChip,
                {
                  backgroundColor: selected
                    ? (isDark ? 'rgba(5, 150, 105, 0.25)' : colors.primaryLight)
                    : colors.card,
                  borderColor: selected ? colors.primary : colors.cardBorder,
                },
                selected && styles.selectionChipSelected,
              ]}
              onPress={() => onChange(option)}
              accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.selectionChipText,
                  { color: selected ? (isDark ? '#34D399' : colors.primary) : colors.textSecondary },
                  selected && styles.selectionChipTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

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
  const { colors, isDark } = useTheme();
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
  const initialSpecies = editItem?.species || editItem?.extra_fields?.species || '';
  const isInitialCustom = Boolean(initialSpecies && !STANDARD_PET_SPECIES.includes(initialSpecies));

  const [animalSpecies, setAnimalSpecies] = useState(isInitialCustom ? 'Outro' : initialSpecies);
  const [customSpecies, setCustomSpecies] = useState(isInitialCustom ? initialSpecies : '');
  const [isCustomSpecies, setIsCustomSpecies] = useState(isInitialCustom || initialSpecies === 'Outro');
  const [animalGender, setAnimalGender] = useState(editItem?.gender || editItem?.extra_fields?.gender || '');
  const [animalBreed, setAnimalBreed] = useState(editItem?.breed || editItem?.extra_fields?.breed || '');
  const [animalSize, setAnimalSize] = useState(editItem?.size || editItem?.extra_fields?.size || '');
  const [animalAge, setAnimalAge] = useState(editItem?.age || editItem?.extra_fields?.age || '');
  const [animalCollar, setAnimalCollar] = useState(editItem?.collar || editItem?.extra_fields?.collar || '');
  const [animalNeutered, setAnimalNeutered] = useState(editItem?.neutered || editItem?.extra_fields?.neutered || '');
  const [animalTemperament, setAnimalTemperament] = useState(
    Array.isArray(editItem?.extra_fields?.temperament) ? editItem.extra_fields.temperament : []
  );
  
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
  // Verificação Inteligente de Avistamentos Duplicados / Próximos
  const [nearbyMatches, setNearbyMatches] = useState([]);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [bypassedMatchCheck, setBypassedMatchCheck] = useState(false);
  const [selectedMatchPet, setSelectedMatchPet] = useState(null);
  const [submittingMatchSighting, setSubmittingMatchSighting] = useState(false);

  const renderLocationAndRewardSection = () => {
    const isLost = status === 'lost';
    const isSpotted = status === 'found' && foundCustody === 'spotted';
    const isSheltered = status === 'found' && foundCustody === 'with_me';

    return (
      <View>
        <Text style={[styles.label, { color: colors.text }]}>
          {isLost
            ? 'Região do Desaparecimento (Epicentro)'
            : isSpotted
            ? 'Local do Avistamento na Rua'
            : 'Local de Resgate do Animal'}
        </Text>

        {/* Card Educativo de Privacidade e Proteção Anti-Golpes */}
        {isLost && (
          <View style={{
            backgroundColor: isDark ? '#091512' : COLORS.primaryLight,
            borderColor: isDark ? '#1C362D' : COLORS.primaryBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <MaterialIcons name="security" size={22} color={COLORS.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#34D399' : COLORS.primaryDark, marginBottom: 3 }}>
                🛡️ Privacidade do Tutor Protegida
              </Text>
              <Text style={{ fontSize: 11.5, color: isDark ? '#CBD5E1' : '#334155', lineHeight: 17 }}>
                O número da sua residência <Text style={{ fontWeight: '800' }}>NÃO é divulgado</Text>. Usamos a coordenada marcada apenas como <Text style={{ fontWeight: '800' }}>epicentro geográfico</Text> para enviar notificações automáticas a voluntários e lares temporários no raio do desaparecimento.
              </Text>
            </View>
          </View>
        )}

        {isSheltered && (
          <View style={{
            backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
            borderColor: isDark ? '#1E3E24' : '#BBF7D0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <MaterialIcons name="home" size={22} color="#16A34A" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#86EFAC' : '#15803D', marginBottom: 3 }}>
                🔒 Acolhimento Seguro
              </Text>
              <Text style={{ fontSize: 11.5, color: isDark ? '#D1FAE5' : '#166534', lineHeight: 17 }}>
                O endereço do seu lar permanece em sigilo. O tutor verá apenas o bairro e a cidade onde o animal foi resgatado, entrando em contato através do chat seguro.
              </Text>
            </View>
          </View>
        )}

        {isSpotted && (
          <View style={{
            backgroundColor: isDark ? '#78350F' : '#FEF3C7',
            borderColor: isDark ? '#B45309' : '#FDE68A',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <MaterialIcons name="add-location-alt" size={22} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FDE68A' : '#B45309', marginBottom: 3 }}>
                📍 Avistamento em Via Pública
              </Text>
              <Text style={{ fontSize: 11.5, color: isDark ? '#FEF3C7' : '#92400E', lineHeight: 17 }}>
                O endereço deste ponto da rua ficará visível para que o tutor e a comunidade possam traçar a rota até onde o animal foi visto.
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.locationHint, { color: colors.textSecondary }]}>
          {isLost
            ? 'Escolha no mapa o ponto ou região aproximada onde o pet fugiu ou foi visto pela última vez.'
            : isSpotted
            ? 'Marque no mapa o ponto exato da rua onde você viu o animal solto.'
            : 'Marque no mapa o local onde você encontrou e recolheu o animal.'}
        </Text>
        {renderMapLocationButton()}

        <View style={styles.datePickerContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Data do Evento *</Text>
          <TouchableOpacity
            style={[styles.datePickerButton, { backgroundColor: isDark ? '#161F30' : '#F9FAFB', borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.datePickerButtonText, { color: colors.text }]}>
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
            <View style={[styles.calendarWrapper, { backgroundColor: colors.surface }]}>
              <View style={[styles.calendarHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.calendarTitle, { color: colors.text }]}>Selecione a Data</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <Calendar
                current={date}
                minDate="2020-01-01"
                maxDate={new Date().toISOString().split('T')[0]}
                onDayPress={handleDateSelect}
                markedDates={{ [date]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#FFFFFF' } }}
                theme={{
                  backgroundColor: colors.surface,
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                }}
              />
              <Button title="Confirmar data" onPress={() => setShowDatePicker(false)} style={styles.modalButton} />
            </View>
          </View>
        </Modal>

        {status === 'lost' && (
          <View style={[styles.rewardSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setOfferReward(!offerReward)}
            >
              <View style={[styles.checkbox, { borderColor: colors.border }, offerReward && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {offerReward && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Oferecer Recompensa</Text>
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
        <View style={[styles.thirdPartySection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsThirdPartyOwner(!isThirdPartyOwner)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, { borderColor: colors.border }, isThirdPartyOwner && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {isThirdPartyOwner && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>
              Estou publicando em nome de outra pessoa
            </Text>
          </TouchableOpacity>

          {isThirdPartyOwner && (
            <View style={[styles.thirdPartyInputsBox, { borderTopColor: colors.border }]}>
              <Text style={[styles.thirdPartyHint, { color: colors.textSecondary }]}>
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
                placeholder="Ex: (54) 99999-9999"
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
  };

  const renderMapLocationButton = () => {
    const isLost = status === 'lost';
    const isSpotted = status === 'found' && foundCustody === 'spotted';

    return (
      <>
        <TouchableOpacity
          style={[styles.mapButton, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : colors.primaryLight }]}
          onPress={() => setMapModalVisible(true)}
        >
          <Text style={[styles.mapButtonText, { color: colors.primary }]}>
            {mapLocation
              ? '📍 Alterar ponto no mapa'
              : (isLost ? '📍 Marcar Região de Desaparecimento no Mapa' : '🗺️ Escolher localização no mapa')}
          </Text>
        </TouchableOpacity>
        {mapLocation && (
          <Text style={[styles.mapSelectedText, { color: colors.textSecondary }]}>
            Epicentro GPS: {mapLocation.latitude.toFixed(5)}, {mapLocation.longitude.toFixed(5)}
          </Text>
        )}
        {mapLocation && (
          <View style={[styles.addressFieldsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.label, { marginBottom: 8, color: colors.text }]}>
              {isLost ? 'Região e Referências (Sem expor residência)' : 'Endereço do Local (Editável)'}
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: isLost ? 1.5 : 2.2 }}>
                <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>
                  {isLost ? 'Ponto de Referência / Rua' : 'Rua / Logradouro'}
                </Text>
                <TextInput
                  style={[styles.singleLineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={mapLocationDetails?.street || ''}
                  onChangeText={(t) => {
                    const updated = { ...(mapLocationDetails || {}), street: t };
                    setMapLocationDetails(updated);
                    const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                    setMapAddressText(formatted);
                  }}
                  placeholder={isLost ? 'Ex: Próximo à Praça / Mercado' : 'Ex: Rua das Flores'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {!isLost && (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>
                    {isSpotted ? 'Nº Aprox.' : 'Nº da Casa'}
                  </Text>
                  <TextInput
                    style={[styles.singleLineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    value={mapLocationDetails?.number || ''}
                    onChangeText={(t) => {
                      const updated = { ...(mapLocationDetails || {}), number: t };
                      setMapLocationDetails(updated);
                      const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                      setMapAddressText(formatted);
                    }}
                    placeholder={isSpotted ? 'Ex: 450' : 'Ex: 123'}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>Bairro</Text>
                <TextInput
                  style={[styles.singleLineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={mapLocationDetails?.district || neighborhood || ''}
                  onChangeText={(t) => {
                    setNeighborhood(t);
                    const updated = { ...(mapLocationDetails || {}), district: t };
                    setMapLocationDetails(updated);
                    const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                    setMapAddressText(formatted);
                  }}
                  placeholder="Ex: Centro"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>Cidade</Text>
                <TextInput
                  style={[styles.singleLineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={city}
                  onChangeText={(t) => {
                    setCity(t);
                    const updated = { ...(mapLocationDetails || {}), city: t };
                    setMapLocationDetails(updated);
                    const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                    setMapAddressText(formatted);
                  }}
                  placeholder="Ex: Passo Fundo"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 0.8 }}>
                <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>Estado</Text>
                <TextInput
                  style={[styles.singleLineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={state}
                  onChangeText={(t) => {
                    const upper = t.toUpperCase();
                    setState(upper);
                    const updated = { ...(mapLocationDetails || {}), state: upper };
                    setMapLocationDetails(updated);
                    const formatted = [updated.street, updated.number, updated.district, updated.city, updated.state].filter(Boolean).join(', ');
                    setMapAddressText(formatted);
                  }}
                  placeholder="UF"
                  maxLength={2}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.addressEditorContainer}>
              <Text style={[styles.smallInputLabel, { color: colors.textSecondary }]}>Endereço Completo</Text>
              <TextInput
                style={[styles.addressInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={mapAddressText}
                onChangeText={setMapAddressText}
                placeholder="Edite o endereço gerado pelo mapa"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </>
    );
  };

  const renderMapLocationPicker = () => (
    <MapLocationPicker
      visible={mapModalVisible}
      initialLocation={mapLocation}
      showRadius={false}
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
      
      const loadedSpecies = typeof editItem.species !== 'undefined'
        ? editItem.species
        : (editItem.extra_fields && typeof editItem.extra_fields.species !== 'undefined' ? editItem.extra_fields.species : '');
      if (loadedSpecies) {
        if (STANDARD_PET_SPECIES.includes(loadedSpecies)) {
          setAnimalSpecies(loadedSpecies);
          setIsCustomSpecies(false);
          setCustomSpecies('');
        } else {
          setAnimalSpecies('Outro');
          setIsCustomSpecies(true);
          setCustomSpecies(loadedSpecies);
        }
      }
      
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

  const handleSpeciesChange = (selected) => {
    if (selected === 'Outro') {
      setAnimalSpecies('Outro');
      setIsCustomSpecies(true);
    } else {
      setAnimalSpecies(selected);
      setIsCustomSpecies(false);
      setCustomSpecies('');
    }
  };

  const buildAutoTitle = () => {
    if (itemType !== 'animal') {
      return 'Item';
    }

    const effectiveSpecies = isCustomSpecies ? (customSpecies.trim() || 'Outro') : (animalSpecies.trim() || 'Animal');
    const species = normalizeSpeciesValue(effectiveSpecies) || 'Animal';
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

    const effectiveSpecies = isCustomSpecies ? customSpecies.trim() : animalSpecies.trim();
    if (itemType === 'animal' && (!effectiveSpecies || effectiveSpecies.toLowerCase() === 'outro')) {
      const msg = isCustomSpecies || animalSpecies === 'Outro'
        ? 'Por favor, informe a espécie do animal'
        : 'Selecione a espécie do animal';
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

  const handleConfirmMatchSighting = async () => {
    if (!selectedMatchPet) return;
    setSubmittingMatchSighting(true);
    try {
      let photoUrl = null;
      if (photos && photos.length > 0 && photos[0]?.uri) {
        try {
          photoUrl = await sightingsService.uploadSightingPhoto(selectedMatchPet.id, photos[0].uri);
        } catch (uploadErr) {
          console.warn('[RegisterItem] Erro ao subir foto do avistamento:', uploadErr);
        }
      }

      await sightingsService.recordSightingAndUpdateItemLocation({
        itemId: selectedMatchPet.id,
        userId: user.id,
        location: mapLocation ? { latitude: Number(mapLocation.latitude), longitude: Number(mapLocation.longitude), address: mapAddressText } : mapAddressText,
        description: description?.trim() || 'Avistado novamente por um usuário nesta região.',
        photoUrl,
      });

      setShowMatchingModal(false);
      Alert.alert(
        'Localização Atualizada! 🎯',
        `A localização de "${selectedMatchPet.title}" foi atualizada no mapa para o ponto onde você o viu. O tutor e voluntários foram avisados!`,
        [
          {
            text: 'Ver no Mapa',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'MainApp',
                    params: {
                      screen: 'MapTab',
                      params: {
                        focusItemId: selectedMatchPet.id,
                        showRoute: true,
                        targetCoords: mapLocation,
                      },
                    },
                  },
                ],
              });
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar o avistamento. Tente publicar como um novo registro.');
    } finally {
      setSubmittingMatchSighting(false);
    }
  };

  const handleContinueWithNewRegistration = () => {
    setShowMatchingModal(false);
    setBypassedMatchCheck(true);
    setTimeout(() => {
      handlePublish();
    }, 150);
  };

  const handlePublish = async () => {
    console.log('[RegisterItem] handlePublish acionado! Status:', status, 'ItemType:', itemType, 'Fotos:', photos.length);
    if (!validateFields()) {
      console.log('[RegisterItem] Falha na validação dos campos.');
      return;
    }

    // 1. Verificação Inteligente de Animais Semelhantes Já Registrados na Região
    if (
      !editItem &&
      itemType === 'animal' &&
      (foundCustody === 'spotted' || status === 'found' || status === 'lost') &&
      !bypassedMatchCheck &&
      mapLocation?.latitude &&
      mapLocation?.longitude
    ) {
      try {
        const effectiveSpecies = isCustomSpecies ? customSpecies.trim() : animalSpecies.trim();
        const matches = await sightingsService.findNearbyPotentialMatches({
          latitude: Number(mapLocation.latitude),
          longitude: Number(mapLocation.longitude),
          species: effectiveSpecies,
          maxRadiusKm: 5,
        });

        if (matches && matches.length > 0) {
          setNearbyMatches(matches);
          setSelectedMatchPet(matches[0]);
          setShowMatchingModal(true);
          return;
        }
      } catch (matchErr) {
        console.warn('[RegisterItem] Erro ao buscar correspondências próximas:', matchErr);
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

      const isDirectAdoption = status === 'adoption';
      const effectiveStatus = isDirectAdoption ? 'found' : status;
      const effectiveSpecies = isCustomSpecies ? customSpecies.trim() : animalSpecies.trim();

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
        species: toNull(effectiveSpecies),
        gender: toNull(animalGender),
        breed: toNull(animalBreed),
        size: toNull(animalSize),
        age: toNull(animalAge),
        collar: toNull(animalCollar),
        neutered: toNull(animalNeutered),
        // Adicionar extra_fields para dados flexíveis
        extra_fields: {
          brand: toNull(brand),
          color: toNull(color),
          serial_number: toNull(serialNumber),
          species: toNull(effectiveSpecies),
          gender: toNull(animalGender),
          breed: toNull(animalBreed),
          size: toNull(animalSize),
          age: toNull(animalAge),
          collar: toNull(animalCollar),
          neutered: toNull(animalNeutered),
          temperament: (status === 'adoption' || (status === 'found' && Boolean(adoptionIntent))) ? (animalTemperament || []) : [],
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
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainApp');
              }
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

        if (status === 'lost' && resultItem) {
          // Dispara alerta comunitário por proximidade para todos os voluntários e moradores da região
          broadcastLostPetAlertToNearbyUsers(resultItem, user.id)
            .then(({ notifiedCount }) => {
              if (notifiedCount > 0) {
                console.log(`[RegisterItem] 📢 ${notifiedCount} usuários notificados por proximidade.`);
              }
            })
            .catch((e) => console.warn('[RegisterItem] Erro ao disparar alerta de proximidade:', e.message));
        }

        Alert.alert(
          status === 'lost' ? '🚨 Alerta Comunitário Emitido!' : 'Sucesso',
          status === 'lost'
            ? 'Seu pet foi publicado e voluntários na região foram notificados para ajudar nas buscas!'
            : 'Animal registrado com sucesso!',
          [
            {
              text: 'Ir para Home',
              onPress: () => {
                goToHomeAfterPublish();
              },
            },
          ]
        );
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, padding: 28, width: '85%', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: colors.text }}>{foundModalTitle}</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }}>{foundModalMessage}</Text>
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

  // Modal de Detecção Inteligente de Animais Semelhantes Já Registrados na Região
  const renderNearbyMatchingModal = () => (
    <Modal
      visible={showMatchingModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMatchingModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : COLORS.primaryBorder, borderWidth: 1.5, borderRadius: 24, padding: 20, width: '100%', maxWidth: 420, maxHeight: '85%' }}>
          
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.primaryBorder }}>
              <MaterialIcons name="radar" size={26} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 4 }}>
              Animal Semelhante por Perto!
            </Text>
            <Text style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 }}>
              Encontramos este(s) pet(s) parecido(s) registrado(s) nessa mesma região. Você está vendo este mesmo animal?
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 220, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
            {nearbyMatches.map((match) => {
              const isSelected = selectedMatchPet?.id === match.id;
              const photoUrl = match.photo_urls?.[0];
              const distText = match.distanceKm < 1 ? `${Math.round(match.distanceKm * 1000)}m de você` : `${match.distanceKm.toFixed(1)} km de você`;

              return (
                <TouchableOpacity
                  key={String(match.id)}
                  onPress={() => setSelectedMatchPet(match)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                    backgroundColor: isSelected ? (isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.primaryLight) : (isDark ? '#1E293B' : '#F8FAFC'),
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={photoUrl ? { uri: photoUrl } : require('../../assets/logo.png')}
                    style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: isDark ? '#0F172A' : '#E2E8F0', marginRight: 10 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                      {match.title || 'Pet sem nome'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                      {match.species || 'Animal'}{match.breed ? ` • ${match.breed}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <MaterialIcons name="place" size={13} color={COLORS.primary} style={{ marginRight: 2 }} />
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.primary }}>
                        {distText}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleConfirmMatchSighting}
              disabled={submittingMatchSighting}
              style={{
                backgroundColor: '#16A34A',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
              activeOpacity={0.85}
            >
              {submittingMatchSighting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                    Sim, é ele! Atualizar Localização
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinueWithNewRegistration}
              disabled={submittingMatchSighting}
              style={{
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                Não, é outro animal (Criar Novo)
              </Text>
            </TouchableOpacity>
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
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <Text style={[styles.title, { color: colors.text }]}>Editar Animal</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tipo: {ITEM_TYPES[normalized]?.label || normalized || editItem.category}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: 'bold' }}>
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
        color: colors.primaryLight,
        icon: '🐾'
      }
    ];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Registrar</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 16 }}>Seu animal perdido ou encontrado</Text>
        </View>
        <View style={{ gap: 18, marginHorizontal: 12, marginBottom: 32 }}>
          {typeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelectType(opt.key)}
              style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}>
                <View style={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : opt.color, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 18 }}>
                  <Text style={{ fontSize: 26 }}>{opt.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: colors.text }}>{opt.label}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 2 }}>{opt.desc}</Text>
                </View>
                <Text style={{ fontSize: 22, color: colors.textMuted, marginLeft: 8 }}>→</Text>
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView
            style={{ flex: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 180 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <View style={styles.statusContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Qual é o objetivo desta publicação? *</Text>
                <View style={styles.statusOptions}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' },
                      status === 'lost' && styles.statusButtonActive,
                    ]}
                    onPress={() => setStatus('lost')}
                  >
                    <Text style={[
                      styles.statusText,
                      { color: colors.textSecondary },
                      status === 'lost' && styles.statusTextActive,
                    ]}>
                      Perdi
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' },
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
                      { color: colors.textSecondary },
                      status === 'found' && styles.statusTextActive,
                    ]}>
                      Encontrei
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' },
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
                      { color: colors.textSecondary },
                      status === 'adoption' && styles.statusTextActive,
                    ]}>
                      Para Adoção
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Informação sobre Publicação Direta para Adoção */}
              {status === 'adoption' && (
                <View style={{ backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FDF2F8', borderWidth: 1.5, borderColor: isDark ? 'rgba(219, 39, 119, 0.4)' : '#F472B6', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                    <MaterialIcons name="favorite" size={18} color="#DB2777" />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: isDark ? '#F472B6' : '#9D174D' }}>
                      Adoção Imediata (Pet sem Tutor Conhecido)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: isDark ? '#FDA4AF' : '#BE185D' }}>
                    Utilize esta opção para doar ou cadastrar animais resgatados, ninhadas ou pets de abrigo que não possuem dono prévio. O anúncio entrará diretamente no feed de adoção.
                  </Text>
                </View>
              )}

              {/* Opções de Custódia e Adoção Futura para Pet Encontrado */}
              {status === 'found' && (
                <View style={[styles.custodySection, { backgroundColor: isDark ? '#161F30' : '#F8FAFC', borderColor: isDark ? '#243248' : '#E2E8F0' }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Onde o animal está agora? *</Text>
                  <View style={styles.custodyOptionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.custodyOptionCard,
                        { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#243248' : '#E2E8F0' },
                        foundCustody === 'with_me' && [styles.custodyOptionCardActive, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : colors.primaryLight }],
                      ]}
                      onPress={() => setFoundCustody('with_me')}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.custodyIconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : colors.primaryLight }, foundCustody === 'with_me' && styles.custodyIconCircleActive]}>
                        <MaterialIcons
                          name="home"
                          size={20}
                          color={foundCustody === 'with_me' ? '#FFFFFF' : colors.primary}
                        />
                      </View>
                      <Text style={[styles.custodyOptionTitle, { color: colors.text }, foundCustody === 'with_me' && [styles.custodyOptionTitleActive, { color: isDark ? '#34D399' : colors.primary }]]}>
                        Estou com ele
                      </Text>
                      <Text style={[styles.custodyOptionSub, { color: colors.textSecondary }]}>
                        Acolhido em lar temporário / minha casa
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.custodyOptionCard,
                        { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#243248' : '#E2E8F0' },
                        foundCustody === 'spotted' && [styles.custodyOptionCardActive, { borderColor: '#D97706', backgroundColor: isDark ? 'rgba(217, 119, 6, 0.18)' : '#FEF3C7' }],
                      ]}
                      onPress={() => {
                        setFoundCustody('spotted');
                        setAdoptionIntent(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.custodyIconCircle, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7' }, foundCustody === 'spotted' && { backgroundColor: '#D97706' }]}>
                        <MaterialIcons
                          name="visibility"
                          size={20}
                          color={foundCustody === 'spotted' ? '#FFFFFF' : '#D97706'}
                        />
                      </View>
                      <Text style={[styles.custodyOptionTitle, { color: colors.text }, foundCustody === 'spotted' && [styles.custodyOptionTitleActive, { color: isDark ? '#FBBF24' : '#B45309' }]]}>
                        Apenas vi o animal
                      </Text>
                      <Text style={[styles.custodyOptionSub, { color: colors.textSecondary }]}>
                        Avistado na rua / sem recolhimento
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Aviso de Proteção e Privacidade do Protetor */}
                  {foundCustody === 'with_me' && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                      marginTop: 8,
                      marginBottom: 4,
                      gap: 8,
                    }}>
                      <MaterialIcons name="security" size={17} color="#2E5634" style={{ marginTop: 1 }} />
                      <Text style={{ flex: 1, fontSize: 11.5, color: isDark ? '#D1FAE5' : '#065F46', lineHeight: 16 }}>
                        <Text style={{ fontWeight: '800' }}>Privacidade Protegida: </Text>
                        O número da sua residência e sua rua exata NÃO serão exibidos publicamente. Apenas seu bairro aproximado será visível para o tutor entrar em contato pelo chat.
                      </Text>
                    </View>
                  )}

                  {/* Opção de Intenção de Adoção (após período mínimo de 7 dias de busca pelo tutor) */}
                  {foundCustody === 'with_me' && (
                    <TouchableOpacity
                      style={[
                        styles.adoptionToggleCard,
                        { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.12)' : '#FFF1F2', borderColor: isDark ? 'rgba(219, 39, 119, 0.3)' : '#FECDD3' },
                        adoptionIntent && [styles.adoptionToggleCardActive, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.22)' : '#FDF2F8', borderColor: '#DB2777' }],
                      ]}
                      onPress={() => setAdoptionIntent((prev) => !prev)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.adoptionToggleLeft}>
                        <View style={[styles.adoptionIconBadge, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.25)' : '#FFE4E6' }, adoptionIntent && styles.adoptionIconBadgeActive]}>
                          <MaterialIcons
                            name="favorite"
                            size={18}
                            color={adoptionIntent ? '#FFFFFF' : '#E11D48'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.adoptionToggleTitle, { color: isDark ? '#F472B6' : '#9F1239' }]}>
                            Disponibilizar para adoção caso o dono não apareça
                          </Text>
                          <Text style={[styles.adoptionToggleSubtitle, { color: isDark ? '#FDA4AF' : '#BE123C' }]}>
                            ⏳ Janela obrigatória de 7 dias: O animal ficará listado como "Encontrado" durante a primeira semana de buscas. Se o tutor não for localizado após 1 semana, a adoção responsável será liberada.
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.customCheckbox, { borderColor: isDark ? '#9F1239' : '#FDA4AF', backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }, adoptionIntent && styles.customCheckboxChecked]}>
                        {adoptionIntent && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {photos.length < MAX_PHOTOS ? (
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: isDark ? '#161F30' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB', marginTop: 8 }]}
                  onPress={pickAndCropImage}
                >
                  <Text style={[styles.uploadButtonText, { color: colors.primary }]}>+ Adicionar Foto * ({photos.length}/{MAX_PHOTOS})</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.inputBg, paddingVertical: 14 }]}>
                  <Text style={[styles.uploadButtonText, { color: colors.textMuted, fontSize: 14 }]}>Limite de {MAX_PHOTOS} fotos atingido</Text>
                </View>
              )}
              {photos.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={[styles.photosTitle, { color: colors.text }]}>Fotos Selecionadas ({photos.length}/{MAX_PHOTOS})</Text>
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

              <SelectionChips
                label="Espécie *"
                options={PET_SPECIES_CHIPS.map((option) => option.value)}
                value={animalSpecies}
                onChange={handleSpeciesChange}
              />
              {isCustomSpecies && (
                <View style={{ marginTop: 2, marginBottom: 10 }}>
                  <Input
                    label="Qual é a espécie do animal? *"
                    placeholder="Ex: Coelho, Hamster, Tartaruga, Porquinho da Índia..."
                    value={customSpecies}
                    onChangeText={setCustomSpecies}
                    style={styles.input}
                    autoFocus
                  />
                </View>
              )}
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
              <SelectionChips label="Castrado(a)?" options={['Sim', 'Não', 'Não sei']} value={animalNeutered} onChange={setAnimalNeutered} />
              <SelectionChips label="Estava com coleira?" options={['Sim', 'Não', 'Não sei']} value={animalCollar} onChange={setAnimalCollar} />

              {/* Seleção de Personalidade & Cuidados (Exclusivo para o fluxo de Adoção) */}
              {(status === 'adoption' || (status === 'found' && foundCustody === 'with_me' && Boolean(adoptionIntent))) && (
                <View style={styles.selectionGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Personalidade & Cuidados *(Incentiva a Adoção)*
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {PET_TEMPERAMENT_OPTIONS.map((trait) => {
                      const isSelected = animalTemperament.includes(trait);
                      return (
                        <TouchableOpacity
                          key={trait}
                          onPress={() => {
                            setAnimalTemperament((prev) =>
                              prev.includes(trait)
                                ? prev.filter((t) => t !== trait)
                                : [...prev, trait]
                            );
                          }}
                          style={[
                            styles.selectionChip,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(219, 39, 119, 0.25)' : '#FDF2F8')
                                : colors.card,
                              borderColor: isSelected ? '#DB2777' : colors.cardBorder,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 10,
                            },
                            isSelected && styles.selectionChipSelected,
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.selectionChipText,
                              {
                                color: isSelected ? '#DB2777' : colors.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {trait}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

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
          {renderNearbyMatchingModal()}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: colors.border, zIndex: 100, elevation: 10 }}>
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 180 }}>
          <View>
            <View style={styles.statusContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Você perdeu ou encontrou? *</Text>
              <View style={styles.statusOptions}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' },
                    status === 'lost' && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus('lost')}
                >
                  <Text style={[
                    styles.statusText,
                    { color: colors.textSecondary },
                    status === 'lost' && styles.statusTextActive,
                  ]}>
                    Perdi
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' },
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
                    { color: colors.textSecondary },
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
                    style={[styles.uploadButton, { backgroundColor: isDark ? '#161F30' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E5E7EB' }]}
                    onPress={pickAndCropImage}
                  >
                    <Text style={[styles.uploadButtonText, { color: colors.primary }]}>+ Adicionar Foto ({photos.length}/{MAX_PHOTOS})</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.inputBg, paddingVertical: 14 }]}>
                    <Text style={[styles.uploadButtonText, { color: colors.textMuted, fontSize: 14 }]}>Limite de {MAX_PHOTOS} fotos atingido</Text>
                  </View>
                )}

                {photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={[styles.photosTitle, { color: colors.text }]}>Fotos Selecionadas ({photos.length}/{MAX_PHOTOS})</Text>
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
        {renderNearbyMatchingModal()}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, padding: 16, paddingBottom: 56, borderTopWidth: 1, borderColor: colors.border }}>
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 0 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>Localização e Recompensa</Text>
          <Text style={[styles.locationHint, { color: colors.textSecondary }]}>
            Escolha no mapa onde o animal foi {status === 'lost' ? 'visto pela última vez' : 'encontrado'}.
          </Text>
          {renderMapLocationButton()}

          <View style={styles.datePickerContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Data do Evento *</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: isDark ? '#161F30' : '#F9FAFB', borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.datePickerButtonText, { color: colors.text }]}>
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
              <View style={[styles.calendarWrapper, { backgroundColor: colors.surface }]}>
                <View style={[styles.calendarHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.calendarTitle, { color: colors.text }]}>Selecione a Data</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
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
                      selectedColor: colors.primary,
                      selectedTextColor: '#FFFFFF',
                    },
                  }}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    arrowColor: colors.primary,
                    monthTextColor: colors.text,
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
            <View style={[styles.rewardSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setOfferReward(!offerReward)}
              >
                <View style={[styles.checkbox, { borderColor: colors.border }, offerReward && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {offerReward && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Oferecer Recompensa</Text>
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
        {renderNearbyMatchingModal()}
        <View style={[styles.navigation, { position: 'absolute', left: 0, right: 0, bottom: 44, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, padding: 16, zIndex: 10 }]}> 
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
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
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
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  custodyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  custodyIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  custodyOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  custodyOptionTitleActive: {
    color: COLORS.primaryDark,
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
    color: COLORS.primary,
  },
  aiButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
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
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  selectionChipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionChipTextSelected: {
    color: COLORS.primaryDark,
  },
  mapButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapButtonText: {
    color: COLORS.primary,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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