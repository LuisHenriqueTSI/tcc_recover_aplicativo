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
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

// Configuração dos tipos de itens igual ao web
const ITEM_TYPES = {
  animal: {
    label: 'Animal',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber'],
    },
    fieldLabels: {
      brand: 'Raça/Tipo',
      color: 'Cor',
      serialNumber: 'Características especiais',
    },
    placeholders: {
      title: 'Ex: Cachorro Golden Retriever, Gato Persa',
      brand: 'Ex: Vira-lata, Poodle, Persa',
      color: 'Ex: Marrom e branco, Preto',
      serialNumber: 'Ex: Coleira azul, cicatriz na orelha',
    },
  },
  document: {
    label: 'Documento',
    fields: {
      required: ['title', 'brand'],
      optional: ['serialNumber', 'color'],
    },
    fieldLabels: {
      brand: 'Tipo de documento',
      color: 'Cor',
      serialNumber: 'Número/Detalhes',
    },
    placeholders: {
      title: 'Ex: RG, CNH, Passaporte',
      brand: 'Ex: RG, CNH, Passaporte',
      color: 'Ex: Azul, Verde',
      serialNumber: 'Ex: 12345678-9',
    },
  },
  object: {
    label: 'Objeto',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber'],
    },
    fieldLabels: {
      brand: 'Marca',
      color: 'Cor',
      serialNumber: 'Características especiais',
    },
    placeholders: {
      title: 'Ex: Mochila preta, Livro de ficção científica',
      brand: 'Ex: Mochila Adidas, Livro "Game of Thrones"',
      color: 'Ex: Preto com detalhes vermelhos',
      serialNumber: 'Ex: Com zíper quebrado, adesivo na lateral',
    },
  },
  electronics: {
    label: 'Eletrônico',
    fields: {
      required: ['title', 'brand', 'color'],
      optional: ['serialNumber'],
    },
    fieldLabels: {
      brand: 'Marca/Modelo',
      color: 'Cor',
      serialNumber: 'Número de série/IMEI',
    },
    placeholders: {
      title: 'Ex: iPhone 13, Fone AirPods',
      brand: 'Ex: iPhone 13 Pro, Samsung Galaxy S21',
      color: 'Ex: Preto, Prata',
      serialNumber: 'Ex: A2846B1C9D7E5F3G',
    },
  },
  jewelry: {
    label: 'Joia/Acessório',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber'],
    },
    fieldLabels: {
      brand: 'Material',
      color: 'Cor',
      serialNumber: 'Marcas distintivas',
    },
    placeholders: {
      title: 'Ex: Anel de ouro, Colar com pedra azul',
      brand: 'Ex: Ouro 18k, Prata 925',
      color: 'Ex: Dourado, Prateado',
      serialNumber: 'Ex: Gravado "Para Maria", com pedra azul',
    },
  },
  clothing: {
    label: 'Roupa',
    fields: {
      required: ['title', 'color'],
      optional: ['brand', 'serialNumber'],
    },
    fieldLabels: {
      brand: 'Tamanho/Marca',
      color: 'Cor',
      serialNumber: 'Detalhes/padrão',
    },
    placeholders: {
      title: 'Ex: Jaqueta de couro, Calça jeans',
      brand: 'Ex: P, M, G, GG / Nike, Adidas',
      color: 'Ex: Azul marinho com listras brancas',
      serialNumber: 'Ex: Bolsos laterais, etiqueta vermelha',
    },
  },
};

const RegisterItemScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const editItem = route?.params?.editItem || null;
  const [step, setStep] = useState(editItem ? 2 : 1);
  const [itemType, setItemType] = useState(editItem?.category || null);
  const [status, setStatus] = useState(editItem?.status || 'lost');
  const [title, setTitle] = useState(editItem?.title || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [location, setLocation] = useState(editItem?.location || '');
  const [date, setDate] = useState(
    editItem?.date ? editItem.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [brand, setBrand] = useState(editItem?.extra_fields?.brand || '');
  const [color, setColor] = useState(editItem?.extra_fields?.color || '');
  const [serialNumber, setSerialNumber] = useState(editItem?.extra_fields?.serial_number || '');
  
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reward
  const [offerReward, setOfferReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');

  // Carregar fotos e todos os dados antigos quando editar item
  useEffect(() => {
    if (editItem) {
      // Carregar fotos antigas
      if (editItem.item_photos && editItem.item_photos.length > 0) {
        const oldPhotos = editItem.item_photos.map(photo => ({
          uri: photo.url,
          type: 'image/jpeg',
          name: photo.url.split('/').pop(),
          id: photo.id, // Marcar como foto antiga
        }));
        setPhotos(oldPhotos);
      }
      
      // Garantir que todos os dados estão carregados
      if (!title && editItem.title) setTitle(editItem.title);
      if (!description && editItem.description) setDescription(editItem.description);
      if (!location && editItem.location) setLocation(editItem.location);
      if (!brand && editItem.extra_fields?.brand) setBrand(editItem.extra_fields.brand);
      if (!color && editItem.extra_fields?.color) setColor(editItem.extra_fields.color);
      if (!serialNumber && editItem.extra_fields?.serial_number) setSerialNumber(editItem.extra_fields.serial_number);
    }
  }, [editItem]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Faça login para registrar itens</Text>
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
    setDate(day.dateString);
    setShowDatePicker(false);
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
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
        mediaTypes: 'Images',
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
      });

      console.log('[pickImage] Result:', result);

      if (!result.canceled && result.assets) {
        console.log('[pickImage] Selected photos:', result.assets.length);
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || asset.uri.split('/').pop(),
        }));
        setPhotos([...photos, ...newPhotos]);
        Alert.alert('Sucesso', `${newPhotos.length} foto(s) adicionada(s)`);
      }
    } catch (error) {
      console.error('[pickImage] Error:', error);
      Alert.alert('Erro', 'Falha ao selecionar fotos: ' + error.message);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const validateFields = () => {
    setError('');
    
    if (!itemType) {
      setError('Selecione um tipo de item');
      return false;
    }
    
    // Em modo edição, aceitar valores antigos - não obrigar a preencher tudo novamente
    if (editItem) {
      // Se tem dados carregados do editItem, não precisa validar rigorosamente
      if (!title.trim() && !editItem.title) {
        setError('Preencha o nome do item');
        return false;
      }
      if (!date.trim() && !editItem.date) {
        setError('Selecione a data');
        return false;
      }
      if (!location.trim() && !editItem.location) {
        setError('Preencha o local');
        return false;
      }
      return true;
    }
    
    // Modo de CRIAÇÃO - validação rigorosa
    if (!title.trim()) {
      setError('Preencha o nome do item');
      return false;
    }

    const config = ITEM_TYPES[itemType];
    
    // Validar campos obrigatórios
    if (config.fields.required.includes('brand') && !brand.trim()) {
      setError(`${config.fieldLabels.brand} é obrigatório`);
      return false;
    }
    if (config.fields.required.includes('color') && !color.trim()) {
      setError(`${config.fieldLabels.color} é obrigatório`);
      return false;
    }
    if (config.fields.required.includes('serialNumber') && !serialNumber.trim()) {
      setError(`${config.fieldLabels.serialNumber} é obrigatório`);
      return false;
    }

    if (!date.trim()) {
      setError('Selecione a data');
      return false;
    }
    if (!location.trim()) {
      setError('Preencha o local');
      return false;
    }
    if (!status) {
      setError('Selecione se perdeu ou encontrou');
      return false;
    }

    return true;
  };

  const handlePublish = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      // Em modo edição, usar dados antigos se não foram modificados
      const itemData = {
        title: title || editItem?.title,
        description: description || editItem?.description,
        location: location || editItem?.location,
        status: status || editItem?.status,
        category: itemType || editItem?.category,
        item_type: itemType || editItem?.item_type,
        date: date ? `${date}T00:00:00Z` : editItem?.date,
        extra_fields: {
          brand: brand || editItem?.extra_fields?.brand,
          color: color || editItem?.extra_fields?.color,
          serial_number: serialNumber || editItem?.extra_fields?.serial_number,
        },
      };

      if (!editItem) {
        itemData.owner_id = user.id;
      }

      let resultItem;
      if (editItem) {
        // Modo de edição
        resultItem = await itemsService.updateItem(editItem.id, itemData);

        // Upload apenas de novas fotos (sem id)
        if (photos && photos.length > 0) {
          const newPhotos = photos.filter(photo => !photo.id); // Fotos novas não têm id
          if (newPhotos.length > 0) {
            console.log('[RegisterItem] Fazendo upload de', newPhotos.length, 'novas fotos');
            for (const photo of newPhotos) {
              try {
                await itemsService.saveItemPhoto(editItem.id, photo);
              } catch (err) {
                console.error('[RegisterItem] Erro ao processar foto:', err);
              }
            }
          }
        }

        Alert.alert('Sucesso', 'Item atualizado com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              // Voltar para o detalhe do item; ItemDetail recarrega on-focus
              navigation.goBack();
            },
          },
        ]);
      } else {
        // Modo de criação
        resultItem = await itemsService.registerItem(itemData, photos);

        Alert.alert('Sucesso', 'Item registrado com sucesso!', [
          {
            text: 'Ir para Home',
            onPress: () => {
              // Resetar formulário
              setItemType(null);
              setStep(1);
              setTitle('');
              setDescription('');
              setLocation('');
              setDate(new Date().toISOString().split('T')[0]);
              setBrand('');
              setColor('');
              setSerialNumber('');
              setPhotos([]);
              setRewardAmount('');
              setRewardDescription('');
              setOfferReward(false);
              setError('');
              navigation.navigate('Home');
            },
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao registrar item';
      console.error('Erro ao registrar:', err);
      setError(errorMsg);
      
      // Mostrar alerta com opção de continuar sem fotos
      if (errorMsg.includes('Network') || errorMsg.includes('upload') || errorMsg.includes('request failed')) {
        Alert.alert(
          'Aviso de Conexão',
          'Não foi possível fazer upload das fotos. Deseja continuar e adicionar fotos depois?',
          [
            {
              text: 'Tentar Novamente',
              onPress: () => setLoading(false),
            },
            {
              text: 'Prosseguir Sem Fotos',
              onPress: async () => {
                try {
                  const itemData = {
                    owner_id: user.id,
                    title,
                    description,
                    location,
                    status,
                    category: itemType,
                    item_type: itemType,
                    date: `${date}T00:00:00Z`,
                    extra_fields: {
                      brand,
                      color,
                      serial_number: serialNumber,
                    },
                  };

                  await itemsService.registerItem(itemData, []);
                  
                  Alert.alert('Sucesso', 'Item registrado sem fotos!', [
                    {
                      text: 'Ir para Home',
                      onPress: () => {
                        setItemType(null);
                        setStep(1);
                        setTitle('');
                        setDescription('');
                        setLocation('');
                        setDate(new Date().toISOString().split('T')[0]);
                        setBrand('');
                        setColor('');
                        setSerialNumber('');
                        setPhotos([]);
                        setRewardAmount('');
                        setRewardDescription('');
                        setOfferReward(false);
                        setError('');
                        navigation.navigate('Home');
                      },
                    },
                  ]);
                } catch (retryErr) {
                  setError(retryErr.message || 'Erro ao registrar item');
                  setLoading(false);
                }
              },
            },
          ]
        );
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Selecionar tipo
  if (step === 1 && !itemType) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{editItem ? 'Editar Item' : 'Selecione o Tipo'}</Text>
          <Text style={styles.subtitle}>Escolha a categoria do item</Text>
        </View>

        <View style={styles.typeGrid}>
          {Object.entries(ITEM_TYPES).map(([key, type]) => (
            <TouchableOpacity
              key={key}
              style={styles.typeButton}
              onPress={() => handleSelectType(key)}
            >
              <Card style={styles.typeCard}>
                <Text style={styles.typeLabel}>{type.label}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Step 2: Detalhes do Item
  if (step === 2) {
    const config = ITEM_TYPES[itemType];
    if (!config) {
      return (
        <ScrollView style={styles.container}>
          <Card style={styles.card}>
            <Text style={styles.title}>Erro ao carregar tipo de item</Text>
            <Text>Por favor, selecione o tipo de item novamente.</Text>
            <Button title="Voltar" onPress={() => setStep(1)} />
          </Card>
        </ScrollView>
      );
    }
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>{editItem ? 'Editar Item' : 'Detalhes do Item'}</Text>
          
          <Input
            label="O que você achou / perdeu? *"
            placeholder={config.placeholders.title}
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          {config.fields.required.map(field => 
            field !== 'title' && (
              <Input
                key={field}
                label={`${config.fieldLabels[field]} *`}
                placeholder={config.placeholders[field]}
                value={field === 'brand' ? brand : field === 'color' ? color : serialNumber}
                onChangeText={value => {
                  if (field === 'brand') setBrand(value);
                  else if (field === 'color') setColor(value);
                  else setSerialNumber(value);
                }}
                style={styles.input}
              />
            )
          )}

          {config.fields.optional.map(field => (
            <Input
              key={field}
              label={`${config.fieldLabels[field]} (opcional)`}
              placeholder={config.placeholders[field]}
              value={field === 'brand' ? brand : field === 'color' ? color : serialNumber}
              onChangeText={value => {
                if (field === 'brand') setBrand(value);
                else if (field === 'color') setColor(value);
                else setSerialNumber(value);
              }}
              style={styles.input}
            />
          ))}

          <Input
            label="Descrição (opcional)"
            placeholder="Descreva detalhes importantes..."
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={4}
            style={styles.input}
          />

          <View style={styles.statusContainer}>
            <Text style={styles.label}>Status *</Text>
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
                onPress={() => setStatus('found')}
              >
                <Text style={[
                  styles.statusText,
                  status === 'found' && styles.statusTextActive,
                ]}>
                  Achei
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.navigation}>
            <Button
              title="Voltar"
              variant="secondary"
              onPress={() => setItemType(null)}
              style={{ flex: 1 }}
            />
            <Button
              title="Próximo"
              onPress={() => setStep(3)}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Step 3: Fotos
  if (step === 3) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Fotos do Item</Text>

          {itemType === 'document' && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Documentos não podem ter fotos por segurança
              </Text>
            </View>
          )}

          {itemType !== 'document' && (
            <>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
              >
                <Text style={styles.uploadButtonText}>+ Adicionar Fotos</Text>
              </TouchableOpacity>

              {photos.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={styles.photosTitle}>Fotos Selecionadas ({photos.length})</Text>
                  <FlatList
                    data={photos}
                    keyExtractor={(_, i) => i.toString()}
                    numColumns={3}
                    scrollEnabled={false}
                    renderItem={({ item, index }) => (
                      <View style={styles.photoItem}>
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.photo}
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Text style={styles.removePhotoText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}
            </>
          )}

          <View style={styles.navigation}>
            <Button
              title="Voltar"
              variant="secondary"
              onPress={() => setStep(2)}
              style={{ flex: 1 }}
            />
            <Button
              title="Próximo"
              onPress={() => setStep(4)}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Step 4: Localização e Recompensa
  if (step === 4) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Localização e Tipo</Text>

          <Input
            label="Local do achado/perda *"
            placeholder="Cidade, bairro ou endereço"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />

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
                  title="Fechar"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </Modal>

          {/* Reward Section */}
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
                <Input
                  label="Descrição da Recompensa"
                  placeholder="Ex: Dinheiro ou cartão presente"
                  value={rewardDescription}
                  onChangeText={setRewardDescription}
                  style={styles.input}
                />
              </>
            )}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.navigation}>
            <Button
              title="Voltar"
              variant="secondary"
              onPress={() => setStep(3)}
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
        </Card>
      </ScrollView>
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
  photosContainer: {
    marginBottom: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  photoItem: {
    flex: 1,
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
});

export default RegisterItemScreen;
