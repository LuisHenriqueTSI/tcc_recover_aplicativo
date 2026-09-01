import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import PetFallbackImage from './PetFallbackImage';

const OptimizedImage = ({
  uri,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  species,
  breed,
  color,
  size,
  compactFallback,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.container]}>
        <PetFallbackImage
          species={species}
          breed={breed}
          color={color}
          size={size}
          compact={compactFallback}
          style={[StyleSheet.absoluteFill, style]}
        />
      </View>
    );
  }

  return (
    <View style={[style, styles.container]}>
      <Image
        {...props}
        source={{
          uri,
          cache: Platform.OS === 'ios' ? 'default' : 'force-cache',
        }}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoading(false)}
        onLoad={onLoad}
        onError={(e) => {
          setLoading(false);
          setFailed(true);
          onError?.(e);
        }}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="small" color="#94A3B8" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
  },
});

export default React.memo(OptimizedImage);
