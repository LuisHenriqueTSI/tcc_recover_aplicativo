import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../components/Card';

const MeusAnunciosScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.placeholderCard}>
        <Text style={styles.title}>Meus Anúncios</Text>
        <Text style={styles.description}>
          Aqui você poderá ver e gerenciar todos os seus anúncios publicados.
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

export default MeusAnunciosScreen;
