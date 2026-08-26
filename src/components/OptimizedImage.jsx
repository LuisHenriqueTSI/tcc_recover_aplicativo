import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';

const OptimizedImage = ({ uri, style, resizeMode = 'cover', onLoad, onError, ...props }) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <View style={styles.fallbackBox} />
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
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  fallbackBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
  },
});

export default React.memo(OptimizedImage);
