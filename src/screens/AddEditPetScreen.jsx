import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';
import { savePet } from '../services/myPets';

const SPECIES_OPTIONS = [
  { id: 'Cachorro', label: 'Cachorro', icon: '🐶' },
  { id: 'Gato', label: 'Gato', icon: '🐱' },
  { id: 'Ave', label: 'Ave', icon: '🦜' },
  { id: 'Outro', label: 'Outro', icon: '🐾' },
];

const GENDER_OPTIONS = ['Macho', 'Fêmea'];
const SIZE_OPTIONS = ['Pequeno', 'Médio', 'Grande', 'Gigante'];
const AGE_OPTIONS = ['Filhote', 'Jovem', 'Adulto', 'Idoso'];
const COLOR_PRESETS = ['Preto', 'Branco', 'Marrom', 'Caramelo', 'Cinza', 'Mesclado', 'Amarelo'];

const AddEditPetScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const editingPet = route.params?.pet || null;

  const [name, setName] = useState(editingPet?.name || '');
  const [species, setSpecies] = useState(editingPet?.species || 'Cachorro');
  const [breed, setBreed] = useState(editingPet?.breed || 'Sem raça definida (SRD)');
  const [gender, setGender] = useState(editingPet?.gender || 'Macho');
  const [size, setSize] = useState(editingPet?.size || 'Médio');
  const [color, setColor] = useState(editingPet?.color || 'Preto');
  const [age, setAge] = useState(editingPet?.age || 'Adulto');
  const [birthDate, setBirthDate] = useState(editingPet?.birth_date || '');
  const [microchip, setMicrochip] = useState(editingPet?.microchip || '');
  const [neutered, setNeutered] = useState(editingPet?.neutered ?? true);
  const [vaccinated, setVaccinated] = useState(editingPet?.vaccinated ?? true);
  const [medicalNotes, setMedicalNotes] = useState(editingPet?.medical_notes || '');
  const [photoUrl, setPhotoUrl] = useState(editingPet?.photo_url || null);
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para selecionar uma foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[AddEditPetScreen] Erro ao escolher foto:', err.message);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do seu pet.');
      return;
    }

    setSaving(true);
    try {
      const petData = {
        id: editingPet?.id || undefined,
        name: name.trim(),
        species,
        breed: breed.trim() || 'Sem raça definida',
        gender,
        size,
        color: color.trim() || 'Não informado',
        age,
        birth_date: birthDate.trim() || null,
        microchip: microchip.trim() || null,
        neutered,
        vaccinated,
        medical_notes: medicalNotes.trim() || null,
        photo_url: photoUrl,
        owner_name: userProfile?.name || 'Tutor',
        owner_phone: userProfile?.whatsapp || userProfile?.phone || null,
        city: userProfile?.city || 'Pelotas',
        state: userProfile?.state || 'RS',
        neighborhood: userProfile?.neighborhood || '',
      };

      await savePet(user.id, petData);
      Alert.alert(
        'Sucesso!',
        `Os dados e o RG de ${name.trim()} foram salvos com sucesso.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar os dados do pet: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Escolha de Foto */}
        <View style={styles.photoPickerContainer}>
          <TouchableOpacity
            style={[styles.photoBox, { borderColor: colors.primary, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photoImage} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color={colors.primary} />
                <Text style={[styles.photoPlaceholderText, { color: colors.primary }]}>Adicionar Foto do Pet</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Nome do Pet */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Nome do Pet *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: Rex, Mel, Thor..."
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Espécie */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Espécie</Text>
          <View style={styles.optionsRow}>
            {SPECIES_OPTIONS.map((item) => {
              const isSelected = species === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(46, 86, 52, 0.3)' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSpecies(item.id)}
                >
                  <Text style={styles.chipEmoji}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Raça */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Raça</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: Poodle, SRD, Pinscher, Siamês..."
            placeholderTextColor={colors.textMuted}
            value={breed}
            onChangeText={setBreed}
          />
        </View>

        {/* Sexo */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Sexo</Text>
          <View style={styles.optionsRow}>
            {GENDER_OPTIONS.map((item) => {
              const isSelected = gender === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chipBtnFlex,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(46, 86, 52, 0.3)' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setGender(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {item === 'Macho' ? '♂️ Macho' : '♀️ Fêmea'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Porte */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Porte</Text>
          <View style={styles.optionsRow}>
            {SIZE_OPTIONS.map((item) => {
              const isSelected = size === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(46, 86, 52, 0.3)' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSize(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor / Pelagem */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Cor / Pelagem</Text>
          <View style={[styles.optionsRow, { marginBottom: 8 }]}>
            {COLOR_PRESETS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.miniColorTag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => setColor(c)}
              >
                <Text style={[styles.miniColorTagText, { color: colors.textSecondary }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: Preto e Branco com patas brancas"
            placeholderTextColor={colors.textMuted}
            value={color}
            onChangeText={setColor}
          />
        </View>

        {/* Faixa Etária */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Faixa Etária / Idade</Text>
          <View style={styles.optionsRow}>
            {AGE_OPTIONS.map((item) => {
              const isSelected = age === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(46, 86, 52, 0.3)' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAge(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Número do Microchip ou RGA */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Microchip / Registro RGA (Opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: 981020000123456"
            placeholderTextColor={colors.textMuted}
            value={microchip}
            onChangeText={setMicrochip}
          />
        </View>

        {/* Saúde: Castração e Vacinação */}
        <View style={styles.healthTogglesRow}>
          <TouchableOpacity
            style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: neutered ? '#16A34A' : colors.border }]}
            onPress={() => setNeutered(!neutered)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={neutered ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={neutered ? '#16A34A' : colors.textMuted}
            />
            <Text style={[styles.toggleCardText, { color: colors.text }]}>Animal Castrado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: vaccinated ? '#16A34A' : colors.border }]}
            onPress={() => setVaccinated(!vaccinated)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={vaccinated ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={vaccinated ? '#16A34A' : colors.textMuted}
            />
            <Text style={[styles.toggleCardText, { color: colors.text }]}>Vacinas em Dia</Text>
          </TouchableOpacity>
        </View>

        {/* Observações Médicas / Alergias */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Observações Médicas / Cuidados (Opcional)</Text>
          <TextInput
            style={[styles.inputMulti, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: Alérgico a dipirona, dócil com crianças, toma medicação para coração..."
            placeholderTextColor={colors.textMuted}
            value={medicalNotes}
            onChangeText={setMedicalNotes}
            multiline
          />
        </View>

        {/* Botão de Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: COLORS.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="badge" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>
                {editingPet ? 'Salvar Alterações do RG' : 'Salvar Pet & Gerar RG Digital'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  photoPickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoPlaceholderText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  chipBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12.5,
  },
  miniColorTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniColorTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  healthTogglesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toggleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  toggleCardText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default AddEditPetScreen;
