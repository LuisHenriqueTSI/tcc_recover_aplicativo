import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import Card from '../components/Card';
import Button from '../components/Button';

const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [owner, setOwner] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItemDetails();
    // Set up navigation options
    navigation.setOptions({
      title: 'Detalhes do Item',
      headerStyle: {
        backgroundColor: '#4F46E5',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, []);

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      const itemData = await itemsService.getItemById(itemId);
      
      if (itemData) {
        setItem(itemData);
        setPhotos(itemData.item_photos || []);
        setOwner(itemData.profiles);
        // Rewards would come from a separate query if needed
      } else {
        Alert.alert('Erro', 'Item não encontrado');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Erro ao carregar:', error);
      Alert.alert('Erro', 'Falha ao carregar detalhes do item');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = () => {
    if (!item) return;
    navigation.navigate('RegisterItem', {
      editItem: item,
      onSave: loadItemDetails, // Atualizar após salvar
    });
  };

  const handleDeleteItem = () => {
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
              setDeleting(true);
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Item excluído com sucesso');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir item: ' + error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsResolved = () => {
    Alert.alert(
      'Marcar como Resolvido',
      'Confirma que este item foi encontrado/devolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await itemsService.markItemAsResolved(itemId);
              Alert.alert('Sucesso', 'Item marcado como resolvido!');
              loadItemDetails();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao marcar como resolvido: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = () => {
    if (!user) {
      Alert.alert('Login Necessário', 'Faça login para enviar mensagens');
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('ChatTab', { itemId, ownerId: item?.owner_id });
  };

  const handleReportSighting = () => {
    if (!user) {
      Alert.alert('Login Necessário', 'Faça login para reportar avistamentos');
      navigation.navigate('Login');
      return;
    }
    // TODO: Implementar flow de avistamento
    Alert.alert('Em Desenvolvimento', 'Feature de avistamento em desenvolvimento');
  };

  const isOwner = user && item && item.owner_id === user.id;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Item não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Fotos do Item */}
      {photos && photos.length > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={(_, idx) => idx.toString()}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          renderItem={({ item: photo }) => (
            <Image
              source={{ uri: photo.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          )}
          scrollEnabled={photos.length > 1}
          style={styles.photosContainer}
        />
      ) : (
        <View style={styles.noPhotoContainer}>
          <MaterialIcons name="image-not-supported" size={48} color="#D1D5DB" />
          <Text style={styles.noPhotoText}>Sem fotos</Text>
        </View>
      )}

      <View style={styles.contentContainer}>
        {/* Título e Status */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {item.status === 'lost' ? '🔴 Perdido' : '🟢 Encontrado'}
              </Text>
              {item.resolved && <Text style={styles.resolvedBadge}>✓ Resolvido</Text>}
            </View>
          </View>
        </View>

        {/* Informações Básicas */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialIcons name="category" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{item.category}</Text>
          </View>
        </Card>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Campos Adicionais */}
        {item.extra_fields && Object.keys(item.extra_fields).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Adicionais</Text>
            {Object.entries(item.extra_fields).map(([key, value]) => (
              <View key={key} style={styles.extraField}>
                <Text style={styles.fieldLabel}>{key}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Informações do Proprietário */}
        {owner && (
          <Card style={styles.ownerCard}>
            <Text style={styles.sectionTitle}>Proprietário</Text>
            <View style={styles.ownerInfo}>
              {owner.avatar_url && (
                <Image
                  source={{ uri: owner.avatar_url }}
                  style={styles.avatar}
                />
              )}
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>{owner.name}</Text>
                <Text style={styles.ownerEmail}>{owner.email}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Contagem de Fotos */}
        {photos && photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos ({photos.length})</Text>
          </View>
        )}

        {/* Botões de Ação */}
        <View style={styles.actionsSection}>
          {isOwner ? (
            <>
              <Button
                title="✏️ Editar"
                onPress={handleEditItem}
                style={styles.actionButton}
              />
              <Button
                title="🗑️ Excluir"
                variant="danger"
                onPress={handleDeleteItem}
                style={styles.actionButton}
                disabled={deleting}
              />
              <Button
                title="✓ Marcar como Resolvido"
                variant="secondary"
                onPress={handleMarkAsResolved}
                style={styles.actionButton}
                disabled={item.resolved}
              />
            </>
          ) : (
            <>
              <Button
                title="💬 Enviar Mensagem"
                onPress={handleSendMessage}
                style={styles.actionButton}
              />
              <Button
                title="👁️ Reportar Avistamento"
                variant="secondary"
                onPress={handleReportSighting}
                style={styles.actionButton}
              />
            </>
          )}
        </View>

        {/* Espaço livre no fim */}
        <View style={styles.spacer} />
      </View>
    </ScrollView>
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
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  photosContainer: {
    backgroundColor: '#E5E7EB',
    height: 300,
  },
  mainImage: {
    width: 400,
    height: 300,
  },
  noPhotoContainer: {
    backgroundColor: '#F3F4F6',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  resolvedBadge: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoCard: {
    marginBottom: 16,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  extraField: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  ownerCard: {
    marginBottom: 16,
    padding: 12,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  ownerEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsSection: {
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    marginVertical: 6,
  },
  spacer: {
    height: 40,
  },
});

export default ItemDetailScreen;
