import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as itemsService from '../services/items';
import OptimizedImage from '../components/OptimizedImage';

const SAMPLE_RECOVERED_PETS = [
  {
    id: 'sample-luna',
    title: 'Luna',
    species: 'Gato',
    city: 'Maricá',
    state: 'RJ',
    neighborhood: 'Praia de Itaipuaçu',
    owner_name: 'Juliana Costa',
    created_at: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(), // 35h atrás
    updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // resolvida 10h atrás (duração: 1d 1h)
    resolved: true,
    item_photos: [
      {
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sample-thor',
    title: 'Thor',
    species: 'Cachorro',
    city: 'Guarulhos',
    state: 'SP',
    neighborhood: 'Centro',
    owner_name: 'Anna Paula',
    created_at: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolved: true,
    item_photos: [
      {
        url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sample-bob',
    title: 'Bob',
    species: 'Cachorro',
    city: 'Curitiba',
    state: 'PR',
    neighborhood: 'Batel',
    owner_name: 'Paulo Henrique',
    created_at: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolved: true,
    item_photos: [
      {
        url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
];

const formatResolutionDuration = (createdAt, resolvedAt) => {
  if (!createdAt) return 'Encontrado com sucesso';
  const start = new Date(createdAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffMs = Math.max(0, end - start);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays > 0) {
    if (remainingHours > 0) {
      return `Encontrado após ${diffDays}d ${remainingHours}h`;
    }
    return `Encontrado após ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }
  if (diffHours > 0) {
    return `Encontrado após ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  return 'Encontrado no mesmo dia';
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now - date);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? 'dia atrás' : 'dias atrás'}`;
  }
  if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? 'hora atrás' : 'horas atrás'}`;
  }
  return 'Hoje';
};

const RecoveredPetsScreen = ({ navigation }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');

  const loadRecoveredPets = useCallback(async () => {
    try {
      const data = await itemsService.listRecoveredPets(50);
      if (Array.isArray(data) && data.length > 0) {
        setPets(data);
      } else {
        setPets(SAMPLE_RECOVERED_PETS);
      }
    } catch (error) {
      console.warn('[RecoveredPetsScreen] Erro ao carregar recuperados:', error.message);
      setPets(SAMPLE_RECOVERED_PETS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecoveredPets();
  }, [loadRecoveredPets]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecoveredPets();
  };

  const filteredPets = pets.filter((pet) => {
    const matchesSearch =
      !searchTerm.trim() ||
      String(pet.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pet.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pet.neighborhood || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pet.species || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecies =
      speciesFilter === 'all' ||
      String(pet.species || '').toLowerCase().includes(speciesFilter.toLowerCase());

    return matchesSearch && matchesSpecies;
  });

  const renderPetCard = ({ item }) => {
    const photoUrl = item.item_photos && item.item_photos.length > 0 ? item.item_photos[0].url : null;
    const durationLabel = formatResolutionDuration(item.created_at, item.updated_at);
    const relativeTime = formatRelativeTime(item.updated_at || item.created_at);
    const locationParts = [item.neighborhood, item.city, item.state].filter(Boolean);
    const locationLabel = locationParts.length > 0 ? locationParts.join(', ') : 'Brasil';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          if (typeof item.id === 'number' || !String(item.id).startsWith('sample-')) {
            navigation.navigate('ItemDetail', { itemId: item.id });
          }
        }}
      >
        {/* Faixa Superior Verde: Encontrado(a) */}
        <View style={styles.topStatusBanner}>
          <MaterialIcons name="check-circle" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
          <Text style={styles.topStatusText}>Encontrado</Text>
        </View>

        {/* Imagem do Pet */}
        <View style={styles.imageContainer}>
          {photoUrl ? (
            <OptimizedImage uri={photoUrl} style={styles.petImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="pets" size={48} color="#94A3B8" />
            </View>
          )}

          {/* Faixa Sobreposta na Base da Foto: Tempo até ser encontrado */}
          <View style={styles.durationOverlay}>
            <Text style={styles.durationText}>{durationLabel}</Text>
          </View>
        </View>

        {/* Rodapé / Informações do Pet */}
        <View style={styles.cardFooter}>
          <Text style={styles.petName} numberOfLines={1}>
            {item.title || 'Pet'}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Text style={styles.timeText}>{relativeTime}</Text>
          </View>

          {item.owner_name ? (
            <Text style={styles.tutorText} numberOfLines={1}>
              Tutor: <Text style={{ fontWeight: '600', color: '#475569' }}>{item.owner_name}</Text>
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      {/* Header com Busca e Filtros */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Animais Encontrados 🎉</Text>
        <Text style={styles.headerSubtitle}>
          Histórias de sucesso e pets que já voltaram para casa
        </Text>

        {/* Barra de Pesquisa */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por nome, bairro ou cidade..."
            placeholderTextColor="#64748B"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filtros Rápidos por Espécie */}
        <View style={styles.filtersRow}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'cachorro', label: 'Cachorros' },
            { id: 'gato', label: 'Gatos' },
            { id: 'outro', label: 'Outros' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                speciesFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setSpeciesFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  speciesFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista de Cards */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Carregando animais encontrados...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPets}
          renderItem={renderPetCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sentiment-dissatisfied" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Nenhum pet encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Tente ajustar os termos da sua pesquisa ou filtros.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topStatusBanner: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  topStatusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 95, 70, 0.92)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  durationText: {
    color: '#FEF08A',
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    padding: 14,
  },
  petName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tutorText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default RecoveredPetsScreen;
