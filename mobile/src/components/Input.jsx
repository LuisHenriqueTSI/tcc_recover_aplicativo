import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
} from 'react-native';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  style,
  error,
}) => {
  // Estado local para alternar visualização da senha
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={style}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            error && styles.inputError,
            isPassword && { paddingRight: 44 },
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={text => {
            if (typeof text === 'string' && text.length > 0) {
              const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
              onChangeText(capitalized);
            } else {
              onChangeText(text);
            }
          }}
          secureTextEntry={isPassword ? !showPassword : false}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {isPassword && (
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={22}
            color="#9CA3AF"
            onPress={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              zIndex: 10,
            }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          />
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  input: {
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'transparent',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
