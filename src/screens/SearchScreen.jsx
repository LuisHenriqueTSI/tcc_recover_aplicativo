import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useTheme } from '../contexts/ThemeContext';

const SearchScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('');

  const handleSearch = async () => {
    // Implementar busca
    console.log('Buscando:', { searchTerm, category, location });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Busca Avançada</Text>

        <Input
          label="Palavra-chave"
          placeholder="Buscar por nome, descrição..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.input}
        />

        <Input
          label="Localização"
          placeholder="Cidade, bairro ou endereço"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        <View style={styles.categoryContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
          <View style={styles.categoryOptions}>
            {['animal'].map(cat => (
              <Button
                key={cat}
                title={cat === 'animal' ? 'Pet' : cat}
                variant={category === cat ? 'primary' : 'secondary'}
                onPress={() => setCategory(cat)}
                style={styles.categoryButton}
              />
            ))}
          </View>
        </View>

        <Button
          title="Buscar"
          onPress={handleSearch}
          style={styles.searchButton}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  categoryContainer: {
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '48%',
  },
  searchButton: {
    marginTop: 20,
  },
});

export default SearchScreen;
