import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const FOSTER_SPECIES_OPTIONS = [
  { id: 'dogs', label: '🐶 Cães', text: 'Cães' },
  { id: 'cats', label: '🐱 Gatos', text: 'Gatos' },
  { id: 'birds', label: '🦜 Aves', text: 'Aves' },
  { id: 'others', label: '🐰 Outros', text: 'Outros' },
];

export const FOSTER_SIZE_OPTIONS = [
  { id: 'small', label: 'Pequeno (até 10kg)' },
  { id: 'medium', label: 'Médio (11 a 25kg)' },
  { id: 'large', label: 'Grande (+25kg)' },
];

export const FOSTER_HOUSING_OPTIONS = [
  { id: 'house_yard', label: '🏡 Casa com quintal fechado/murado' },
  { id: 'apartment_net', label: '🏢 Apartamento com rede/tela de proteção' },
  { id: 'house_no_yard', label: '🏠 Casa sem quintal (área interna)' },
  { id: 'farm', label: '🌳 Sítio / Chácara' },
];

const FOSTER_STORAGE_KEY_PREFIX = '@wefind_foster_profile_';
const FOSTER_ALL_REGISTRY_KEY = '@wefind_foster_all_registry';

/**
 * Obtém as configurações de Lar Temporário de um usuário
 */
export const getFosterProfile = async (userId) => {
  if (!userId) return null;
  try {
    // 1. Tenta recuperar do cache local individual
    const local = await AsyncStorage.getItem(`${FOSTER_STORAGE_KEY_PREFIX}${userId}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    // 2. Tenta recuperar do registro comunitário geral
    const allRegistryRaw = await AsyncStorage.getItem(FOSTER_ALL_REGISTRY_KEY);
    if (allRegistryRaw) {
      try {
        const registry = JSON.parse(allRegistryRaw);
        if (registry && registry[userId]) {
          return registry[userId];
        }
      } catch {}
    }

    // 3. Tenta recuperar dos metadados do usuário autenticado no Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId && user.user_metadata?.foster_profile) {
        const profile = user.user_metadata.foster_profile;
        await AsyncStorage.setItem(`${FOSTER_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(profile));
        return profile;
      }
    } catch {}

    return null;
  } catch (error) {
    console.log('[fosterService] Aviso ao buscar perfil de lar temporário:', error.message);
    return null;
  }
};

/**
 * Salva ou atualiza as configurações de Lar Temporário
 */
export const saveFosterProfile = async (userId, fosterData) => {
  if (!userId) throw new Error('ID do usuário não fornecido');

  try {
    const payload = {
      userId,
      isActive: Boolean(fosterData.isActive),
      species: fosterData.species || ['dogs', 'cats'],
      sizes: fosterData.sizes || ['small', 'medium'],
      housing: fosterData.housing || 'house_yard',
      hasOtherPets: Boolean(fosterData.hasOtherPets),
      otherPetsInfo: fosterData.otherPetsInfo || '',
      experienceNotes: fosterData.experienceNotes || '',
      city: fosterData.city || '',
      state: fosterData.state || '',
      neighborhood: fosterData.neighborhood || '',
      userName: fosterData.userName || 'Voluntário WeFIND',
      avatarUrl: fosterData.avatarUrl || null,
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva no cache local do dispositivo
    await AsyncStorage.setItem(`${FOSTER_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(payload));

    // 2. Atualiza os metadados do usuário autenticado no Supabase
    try {
      await supabase.auth.updateUser({
        data: {
          is_foster_volunteer: payload.isActive,
          foster_profile: payload,
        },
      });
    } catch (authErr) {
      console.log('[fosterService] Aviso ao salvar nos metadados do auth:', authErr?.message);
    }

    // 3. Atualiza o registro global de voluntários
    try {
      const allRegistryRaw = await AsyncStorage.getItem(FOSTER_ALL_REGISTRY_KEY);
      const allRegistry = allRegistryRaw ? JSON.parse(allRegistryRaw) : {};
      if (payload.isActive) {
        allRegistry[userId] = payload;
      } else {
        delete allRegistry[userId];
      }
      await AsyncStorage.setItem(FOSTER_ALL_REGISTRY_KEY, JSON.stringify(allRegistry));
    } catch (regErr) {
      console.log('[fosterService] Erro ao atualizar registro de voluntários:', regErr?.message);
    }

    return payload;
  } catch (error) {
    console.log('[fosterService] Erro ao salvar lar temporário:', error?.message);
    throw error;
  }
};

/**
 * Lista voluntários de lar temporário disponíveis para uma cidade/estado/espécie
 */
export const listFosterVolunteers = async ({ city = '', state = '', species = '', housing = '' } = {}) => {
  try {
    const allRegistryRaw = await AsyncStorage.getItem(FOSTER_ALL_REGISTRY_KEY);
    if (!allRegistryRaw) return [];

    let registry = {};
    try {
      registry = JSON.parse(allRegistryRaw);
    } catch {
      return [];
    }

    let volunteers = Object.values(registry).filter(v => v && v.isActive);

    if (city && city.trim()) {
      const normCity = city.trim().toLowerCase();
      volunteers = volunteers.filter(v => (v.city || '').toLowerCase().includes(normCity));
    }

    if (state && state.trim()) {
      const normState = state.trim().toLowerCase();
      volunteers = volunteers.filter(v => (v.state || '').toLowerCase().includes(normState));
    }

    if (species && species !== 'all') {
      volunteers = volunteers.filter(v => Array.isArray(v.species) && v.species.includes(species));
    }

    if (housing && housing !== 'all') {
      volunteers = volunteers.filter(v => v.housing === housing);
    }

    return volunteers.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  } catch (error) {
    console.log('[fosterService] Erro ao listar lares temporários:', error.message);
    return [];
  }
};
