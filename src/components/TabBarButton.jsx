import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TabBarButton = ({ onPress, icon, size = 36, color = '#fff', style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.button, style]}>
    <View style={styles.circle}>
      <MaterialIcons name={icon} size={size} color={color} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default TabBarButton;
