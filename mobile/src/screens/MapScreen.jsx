import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Card from '../components/Card';

const MapScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Card style={styles.placeholderCard}>
        <Text style={styles.title}>Mapa</Text>
        <Text style={styles.description}>
          Funcionalidade de mapa será implementada em breve. Você poderá visualizar a localização dos itens perdidos/encontrados no mapa.
        </Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderCard: {
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default MapScreen;
