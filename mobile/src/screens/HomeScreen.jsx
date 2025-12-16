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
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

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
      setItems(allItems || []);
      applyFilters(allItems || []);

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
    navigation.navigate('RegisterItemTab', { editItem: item });
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

  const renderItemCard = ({ item }) => {
    const isExpanded = expandedItem === item.id;
    const details = expandedItemDetails;

    return (
      <Card style={styles.itemCard}>
        {/* Thumbnail */}
        {thumbnails[item.id] ? (
          <Image
            source={{ uri: thumbnails[item.id] }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Text style={styles.itemImagePlaceholderText}>Sem foto</Text>
          </View>
        )}
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemStatus}>
              {item.status === 'lost' ? '🔴 Perdido' : '🟢 Encontrado'}
            </Text>
          </View>
        </View>

        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>📍 {item.location}</Text>
          <Text style={styles.metaText}>📅 {new Date(item.date).toLocaleDateString()}</Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {loadingDetails ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Detalhes Completos</Text>
                <Text style={styles.detailText}>{item.description}</Text>

                {details?.profiles && (
                  <View style={styles.ownerInfoExpanded}>
                    <Text style={styles.sectionTitle}>Proprietário</Text>
                    <Text style={styles.ownerName}>{details.profiles.name}</Text>
                    <Text style={styles.ownerEmail}>{details.profiles.email}</Text>
                  </View>
                )}

                {details?.rewards && details.rewards.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Recompensa</Text>
                    {details.rewards.map((reward) => (
                      <Text key={reward.id} style={styles.detailText}>
                        R$ {reward.amount} {reward.currency} - {reward.status}
                      </Text>
                    ))}
                  </View>
                )}

                {item.extra_fields && Object.keys(item.extra_fields).length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Informações Adicionais</Text>
                    {Object.entries(item.extra_fields).map(([key, value]) => (
                      <Text key={key} style={styles.detailText}>
                        {key}: {value}
                      </Text>
                    ))}
                  </View>
                )}

                {details?.item_photos && details.item_photos.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Fotos ({details.item_photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {details.item_photos.map((p) => (
                        <Image
                          key={p.id}
                          source={{ uri: p.url }}
                          style={styles.photoThumb}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {user && item.owner_id === user.id ? (
                    <>
                      <Button
                        title="Editar"
                        onPress={() => handleEditItem(item)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Excluir"
                        variant="danger"
                        onPress={() => handleDeleteItem(item.id)}
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                      <Button
                        title="Marcar como Resolvido"
                        variant="secondary"
                        onPress={() => handleMarkAsResolved(item.id)}
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </>
                  ) : (
                    <>
                      <Button
                        title="Enviar Mensagem"
                        onPress={handleSendMessage}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Reportar Avistamento"
                        variant="secondary"
                        onPress={handleReportSighting}
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        <Button
          title={isExpanded ? 'Recolher' : 'Expandir'}
          variant="secondary"
          onPress={() => handleExpandItem(item.id)}
          style={styles.expandButton}
        />
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
      {/* Botão Flutuante para Registrar Item */}
      {user && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => navigation.navigate('RegisterItemTab')}
        >
          <Text style={styles.floatingButtonText}>+ Registrar</Text>
        </TouchableOpacity>
      )}

      {/* Advanced Search & Filters */}
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

      {/* Quick Filters Row */}
      <ScrollView horizontal style={styles.filtersContainer} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.status === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'all' })}
        >
          <Text style={styles.filterButtonText}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.status === 'lost' && styles.filterButtonActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'lost' })}
        >
          <Text style={styles.filterButtonText}>Perdidos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.status === 'found' && styles.filterButtonActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'found' })}
        >
          <Text style={styles.filterButtonText}>Encontrados</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              filters.showMyItems && styles.filterButtonActive,
            ]}
            onPress={handleMyItemsToggle}
          >
            <Text style={styles.filterButtonText}>Meus Itens</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
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
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
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
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HomeScreen;
