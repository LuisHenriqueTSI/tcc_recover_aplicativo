import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  FOSTER_SPECIES_OPTIONS,
  FOSTER_SIZE_OPTIONS,
  FOSTER_HOUSING_OPTIONS,
  getFosterProfile,
  saveFosterProfile,
} from '../services/foster';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FosterVolunteerModal = ({ visible, onClose, onSaved }) => {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(['dogs', 'cats']);
  const [selectedSizes, setSelectedSizes] = useState(['small', 'medium']);
  const [selectedHousing, setSelectedHousing] = useState('house_yard');
  const [hasOtherPets, setHasOtherPets] = useState(false);
  const [otherPetsInfo, setOtherPetsInfo] = useState('');
  const [experienceNotes, setExperienceNotes] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (visible && user) {
      loadData();
    }
  }, [visible, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const existing = await getFosterProfile(user.id);
      if (existing) {
        setIsActive(Boolean(existing.isActive));
        setSelectedSpecies(existing.species || ['dogs', 'cats']);
        setSelectedSizes(existing.sizes || ['small', 'medium']);
        setSelectedHousing(existing.housing || 'house_yard');
        setHasOtherPets(Boolean(existing.hasOtherPets));
        setOtherPetsInfo(existing.otherPetsInfo || '');
        setExperienceNotes(existing.experienceNotes || '');
        setNeighborhood(existing.neighborhood || userProfile?.neighborhood || '');
        setCity(existing.city || userProfile?.city || '');
        setState(existing.state || userProfile?.state || '');
      } else {
        setIsActive(true);
        setNeighborhood(userProfile?.neighborhood || '');
        setCity(userProfile?.city || '');
        setState(userProfile?.state || '');
      }
    } catch (e) {
      console.log('[FosterVolunteerModal] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecies = (id) => {
    if (selectedSpecies.includes(id)) {
      if (selectedSpecies.length > 1) {
        setSelectedSpecies(selectedSpecies.filter(s => s !== id));
      }
    } else {
      setSelectedSpecies([...selectedSpecies, id]);
    }
  };

  const toggleSize = (id) => {
    if (selectedSizes.includes(id)) {
      if (selectedSizes.length > 1) {
        setSelectedSizes(selectedSizes.filter(s => s !== id));
      }
    } else {
      setSelectedSizes([...selectedSizes, id]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        isActive,
        species: selectedSpecies,
        sizes: selectedSizes,
        housing: selectedHousing,
        hasOtherPets,
        otherPetsInfo,
        experienceNotes,
        neighborhood: neighborhood.trim(),
        city: city.trim() || userProfile?.city || '',
        state: state.trim() || userProfile?.state || '',
        userName: userProfile?.name || user?.email?.split('@')[0] || 'Voluntário',
        avatarUrl: userProfile?.avatar_url || null,
      };

      await saveFosterProfile(user.id, data);

      Alert.alert(
        'Sucesso!',
        isActive
          ? '🏡 Você agora faz parte da Rede de Lares Temporários Solidários do WeFIND! Obrigado por ajudar quem mais precisa.'
          : 'Opção de Lar Temporário desativada com sucesso.'
      );

      if (onSaved) onSaved(data);
      onClose();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar suas preferências. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <View style={styles.headerIconCircle}>
                <MaterialIcons name="home-work" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Lar Temporário Solidário</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Acolha temporariamente pets resgatados
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando preferências...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Toggle Principal de Ativação */}
              <View style={[
                styles.activationCard,
                {
                  backgroundColor: isActive
                    ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4')
                    : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: isActive
                    ? (isDark ? 'rgba(22, 163, 74, 0.3)' : '#BBF7D0')
                    : (isDark ? '#334155' : '#E2E8F0'),
                }
              ]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.activationTitle, { color: isActive ? '#15803D' : colors.text }]}>
                    {isActive ? '🏡 Lar Temporário Ativo' : '⚪ Lar Temporário Inativo'}
                  </Text>
                  <Text style={[styles.activationSub, { color: colors.textSecondary }]}>
                    {isActive
                      ? 'Você aparecerá como voluntário disponível para ajudar quem resgatar um animal.'
                      : 'Ative para dizer à comunidade que você pode abrigar um animal temporariamente.'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                  thumbColor={isActive ? '#16A34A' : '#F1F5F9'}
                />
              </View>

              {isActive && (
                <>
                  {/* 1. Espécies */}
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Quais espécies você pode acolher?
                  </Text>
                  <View style={styles.chipRow}>
                    {FOSTER_SPECIES_OPTIONS.map((item) => {
                      const selected = selectedSpecies.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.optionChip,
                            {
                              backgroundColor: selected
                                ? (isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7')
                                : (isDark ? '#1E293B' : '#F1F5F9'),
                              borderColor: selected
                                ? '#16A34A'
                                : (isDark ? '#334155' : '#E2E8F0'),
                            }
                          ]}
                          onPress={() => toggleSpecies(item.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[
                            styles.optionChipText,
                            { color: selected ? '#15803D' : colors.text }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 2. Portes */}
                  <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                    Qual porte de animal seu espaço comporta?
                  </Text>
                  <View style={styles.chipRow}>
                    {FOSTER_SIZE_OPTIONS.map((item) => {
                      const selected = selectedSizes.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.optionChip,
                            {
                              backgroundColor: selected
                                ? (isDark ? 'rgba(5, 150, 105, 0.2)' : colors.primaryLight)
                                : (isDark ? '#1E293B' : '#F1F5F9'),
                              borderColor: selected
                                ? colors.primary
                                : (isDark ? '#334155' : '#E2E8F0'),
                            }
                          ]}
                          onPress={() => toggleSize(item.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[
                            styles.optionChipText,
                            { color: selected ? colors.primaryDark : colors.text }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 3. Tipo de Moradia */}
                  <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                    Tipo de Moradia / Espaço
                  </Text>
                  <View style={{ gap: 6 }}>
                    {FOSTER_HOUSING_OPTIONS.map((item) => {
                      const selected = selectedHousing === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.housingOption,
                            {
                              backgroundColor: selected
                                ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4')
                                : (isDark ? '#1E293B' : '#F8FAFC'),
                              borderColor: selected
                                ? '#16A34A'
                                : (isDark ? '#334155' : '#E2E8F0'),
                            }
                          ]}
                          onPress={() => setSelectedHousing(item.id)}
                          activeOpacity={0.75}
                        >
                          <MaterialIcons
                            name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={20}
                            color={selected ? '#16A34A' : colors.textSecondary}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={[
                            styles.housingOptionText,
                            { color: selected ? '#15803D' : colors.text }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 4. Outros Animais em Casa */}
                  <View style={[styles.inlineToggleRow, { borderColor: colors.border, marginTop: 16 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.inlineToggleTitle, { color: colors.text }]}>
                        Possui outros animais em casa?
                      </Text>
                      <Text style={[styles.inlineToggleSub, { color: colors.textSecondary }]}>
                        Importante para avaliar a convivência e adaptação
                      </Text>
                    </View>
                    <Switch
                      value={hasOtherPets}
                      onValueChange={setHasOtherPets}
                      trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                      thumbColor={hasOtherPets ? '#16A34A' : '#F1F5F9'}
                    />
                  </View>

                  {hasOtherPets && (
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
                      placeholder="Ex: Tenho 1 cão dócil e vacinado..."
                      placeholderTextColor={colors.textSecondary}
                      value={otherPetsInfo}
                      onChangeText={setOtherPetsInfo}
                      maxLength={120}
                    />
                  )}

                  {/* 5. Localização Aproximada */}
                  <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                    Localização Aproximada (Bairro e Cidade)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
                      placeholder="Bairro"
                      placeholderTextColor={colors.textSecondary}
                      value={neighborhood}
                      onChangeText={setNeighborhood}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
                      placeholder="Cidade"
                      placeholderTextColor={colors.textSecondary}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>

                  {/* 6. Observações ou Experiência */}
                  <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                    Observações / Experiência (Opcional)
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
                    placeholder="Ex: Tenho experiência com filhotes, posso administrar remédios..."
                    placeholderTextColor={colors.textSecondary}
                    value={experienceNotes}
                    onChangeText={setExperienceNotes}
                    multiline
                    numberOfLines={3}
                    maxLength={250}
                  />
                </>
              )}

              {/* Botão de Salvar */}
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveButtonText}>Salvar Preferências</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  activationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  activationTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  activationSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  housingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  housingOptionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inlineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  inlineToggleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  inlineToggleSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    marginTop: 6,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default FosterVolunteerModal;
