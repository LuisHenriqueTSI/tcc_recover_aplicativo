import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import { getUser } from '../services/user';
import Card from '../components/Card';
import ShareButton from '../components/ShareButton';
import Button from '../components/Button';
import Input from '../components/Input';
import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    showMyItems: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedItemDetails, setExpandedItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      console.log('[HomeScreen] Carregando itens com filtros:', {
        searchTerm,
        locationFilter,
        status: filters.status,
        category: filters.category,
      });
      let allItems = [];
      if (searchTerm && searchTerm.trim().length > 0) {
        console.log('[HomeScreen] Buscando por termo:', searchTerm);
        allItems = await itemsService.searchItems(searchTerm.trim());
      } else {
        const baseFilters = {};
        if (filters.status !== 'all') baseFilters.status = filters.status;
        if (filters.category !== 'all') baseFilters.category = filters.category;
        if (filters.showMyItems && user) baseFilters.owner_id = user.id;
        allItems = await itemsService.listItems(baseFilters);
      }
      console.log('[HomeScreen] Itens carregados (antes de filtro local):', allItems?.length || 0);

      // Buscar nome do usuário dono do item
      const itemsWithOwner = await Promise.all(
        (allItems || []).map(async (item) => {
          if (item.owner_id) {
            const owner = await getUser(item.owner_id);
            return { ...item, owner_name: owner?.name || owner?.email || 'Usuário' };
          }
          return { ...item, owner_name: 'Usuário' };
        })
      );

      setItems(itemsWithOwner);
      applyFilters(itemsWithOwner);

      // Load thumbnails for these items
      const ids = (allItems || []).map(i => i.id);
      const thumbsMap = await itemsService.getItemThumbnails(ids);
      setThumbnails(thumbsMap || {});
    } catch (error) {
      console.log('[HomeScreen] Erro ao carregar itens:', error.message);
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar detalhes do item quando expandir
  const handleExpandItem = async (itemId) => {
    if (expandedItem === itemId) {
      // Recolher
      setExpandedItem(null);
      setExpandedItemDetails(null);
      return;
    }

    // Expandir
    setExpandedItem(itemId);
    setLoadingDetails(true);

    try {
      const details = await itemsService.getItemDetails(itemId);
      setExpandedItemDetails(details);
    } catch (error) {
      console.log('[HomeScreen] Erro ao carregar detalhes:', error.message);
      setExpandedItemDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const applyFilters = (itemsToFilter) => {
    let filtered = itemsToFilter;

    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.showMyItems && user) {
      filtered = filtered.filter(item => item.owner_id === user?.id);
    }

    if (locationFilter && locationFilter.trim().length > 0) {
      const lf = locationFilter.trim().toLowerCase();
      console.log('[HomeScreen] Aplicando filtro de localização:', lf);
      filtered = filtered.filter(item => {
        const itemLocation = (item.location || '').toLowerCase();
        const matches = itemLocation.includes(lf);
        if (matches) {
          console.log('[HomeScreen] Item encontrado:', item.title, '-', item.location);
        }
        return matches;
      });
    }

    console.log('[HomeScreen] Itens após filtros:', filtered.length);
    setFilteredItems(filtered);
    // Reset expansão ao trocar filtros para evitar blocos estranhos
    setExpandedItem(null);
    setExpandedItemDetails(null);
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    applyFilters(items);
  }, [filters, user, locationFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  // Disable "Meus Itens" filter if not authenticated
  const handleMyItemsToggle = () => {
    if (!user) {
      alert('Faça login para ver seus itens');
      navigation.navigate('Login');
      return;
    }
    setFilters({ ...filters, showMyItems: !filters.showMyItems });
  };

  const handleSendMessage = () => {
    if (!user) {
      alert('Faça login para enviar mensagens');
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('ChatTab');
  };

  const handleReportSighting = () => {
    if (!user) {
      alert('Faça login para reportar avistamentos');
      navigation.navigate('Login');
      return;
    }
    // TODO: Implement report sighting flow
  };

  const handleEditItem = (item) => {
    navigation.navigate('RegisterItem', { editItem: item });
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Item excluído com sucesso');
              loadItems(); // Reload list
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir item: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsResolved = async (itemId) => {
    Alert.alert(
      'Marcar como Resolvido',
      'Confirma que este item foi encontrado/devolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await itemsService.markItemAsResolved(itemId);
              Alert.alert('Sucesso', 'Item marcado como resolvido!');
              loadItems(); // Reload list
            } catch (error) {
              Alert.alert('Erro', 'Falha ao marcar como resolvido: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenItemDetail = (itemId) => {
    navigation.navigate('ItemDetail', { itemId });
  };

  const renderItemCard = ({ item }) => {
    // Cores para status e categoria
    const statusColor = item.status === 'lost' ? '#F87171' : '#34D399';
    const statusLabel = item.status === 'lost' ? 'Perdido' : 'Encontrado';
    const categoryColors = {
      animal: { bg: '#E0E7FF', text: '#6366F1', label: 'Animal' },
      object: { bg: '#FEF3C7', text: '#F59E42', label: 'Objeto' },
      document: { bg: '#FDE68A', text: '#B45309', label: 'Documento' },
      other: { bg: '#F3F4F6', text: '#6B7280', label: 'Outro' },
    };
    const cat = categoryColors[item.category] || categoryColors.other;

    return (
      <Card style={{ padding: 0, marginHorizontal: 12, marginVertical: 14, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
        {/* Imagem */}
        <View style={{ position: 'relative', width: '100%', height: 180 }}>
          {thumbnails[item.id] ? (
            <Image
              source={{ uri: thumbnails[item.id] }}
              style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF' }}>Sem foto</Text>
            </View>
          )}
          {/* Botão de Compartilhar no canto superior direito */}
          <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
            <ShareButton item={item} imageUrl={thumbnails[item.id]} />
          </View>
        </View>
        {/* Tags */}
        <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{statusLabel}</Text>
          </View>
          <View style={{ backgroundColor: cat.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 6 }}>
            <Text style={{ color: cat.text, fontWeight: 'bold', fontSize: 12 }}>{cat.label}</Text>
          </View>
        </View>
        {/* Conteúdo */}
        <View style={{ padding: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>{item.title}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{item.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialIcons name="place" size={16} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginRight: 12 }}>{item.location}</Text>
            <MaterialIcons name="event" size={15} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{item.owner_name}</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E42', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }} onPress={handleSendMessage}>
              <MaterialIcons name="chat" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Contato</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtro avançado escondido em ícone */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 }}>
        <TouchableOpacity onPress={() => setShowAdvancedFilters(v => !v)} style={{ marginRight: 8 }}>
          <MaterialIcons name="filter-list" size={28} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', color: '#4F46E5', fontSize: 16 }}>Filtros</Text>
      </View>
      {showAdvancedFilters && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchLabel}>Buscar</Text>
              <Input
                placeholder="Título, descrição, endereço..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchLabel}>Local</Text>
              <Input
                placeholder="Cidade, bairro, endereço..."
                value={locationFilter}
                onChangeText={setLocationFilter}
              />
            </View>
          </View>
          <View style={styles.searchActions}>
            <Button title="Aplicar" onPress={loadItems} />
            <Button
              title="Limpar"
              variant="secondary"
              onPress={() => {
                setSearchTerm('');
                setLocationFilter('');
                setFilters({ ...filters, status: 'all', category: 'all' });
                loadItems();
              }}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>
      )}

      {/* Quick Filters Row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'all' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="layers" size={14} color={filters.status === 'all' ? '#fff' : '#1F2937'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'all' && styles.filterChipTextActive]}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'lost' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'lost' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="highlight-off" size={14} color={filters.status === 'lost' ? '#fff' : '#B91C1C'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'lost' && styles.filterChipTextActive]}>Perdidos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'found' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'found' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="check-circle" size={14} color={filters.status === 'found' ? '#fff' : '#0F9D58'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'found' && styles.filterChipTextActive]}>Encontrados</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.showMyItems && styles.filterChipActive,
            ]}
            onPress={handleMyItemsToggle}
            activeOpacity={0.85}
          >
            <MaterialIcons name="person" size={14} color={filters.showMyItems ? '#fff' : '#1F2937'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterChipText, filters.showMyItems && styles.filterChipTextActive]}>Meus Itens</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItemCard}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  // filtersContainer removido
  searchContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  searchActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 14,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  itemCard: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  itemImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImagePlaceholderText: {
    color: '#6B7280',
    fontSize: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemStatus: {
    fontSize: 12,
    marginTop: 4,
    color: '#6B7280',
  },
  rewardBadge: {
    backgroundColor: '#FCD34D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rewardBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ownerInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  ownerEmail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  ownerInfoExpanded: {
    paddingVertical: 8,
    marginVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  expandedContent: {
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  expandButton: {
    marginTop: 8,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  fabButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default HomeScreen;
