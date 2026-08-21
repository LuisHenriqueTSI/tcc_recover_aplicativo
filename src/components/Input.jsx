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
  editable = true,
  style,
  inputStyle,
  error,
  autoCapitalize,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  const handleChangeText = (text) => {
    if (!onChangeText) return;

    // Do not transform password, emails, or when autoCapitalize is explicitly 'none'
    if (isPassword || autoCapitalize === 'none' || keyboardType === 'email-address' || keyboardType === 'phone-pad') {
      onChangeText(text);
      return;
    }

    if (autoCapitalize === 'characters') {
      onChangeText(text.toUpperCase());
      return;
    }

    onChangeText(text);
  };

  return (
    <View style={style}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          style={[
            styles.input,
            inputStyle,
            multiline && styles.multilineInput,
            error && styles.inputError,
            isPassword && { paddingRight: 44 },
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          editable={editable}
          onChangeText={handleChangeText}
          secureTextEntry={isPassword ? !showPassword : false}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize || (isPassword || keyboardType === 'email-address' ? 'none' : 'sentences')}
          onFocus={onFocus}
          onBlur={onBlur}
          {...rest}
        />
        {isPassword && (
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color="#64748B"
            onPress={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: 12,
              top: 13,
              zIndex: 10,
              padding: 4,
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
    marginBottom: 6,
    color: '#0F172A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
