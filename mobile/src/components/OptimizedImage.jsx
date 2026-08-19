import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

let imageProcessingQueue = Promise.resolve();

const enqueueImageProcessing = (task) => {
  const result = imageProcessingQueue.then(task, task);
  imageProcessingQueue = result.catch(() => undefined);
  return result;
};

const OptimizedImage = ({ uri, style, resizeMode = 'cover', onLoad, onError, ...props }) => {
  const [optimizedUri, setOptimizedUri] = useState(Platform.OS === 'web' ? uri : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setOptimizedUri(Platform.OS === 'web' || !uri || uri.startsWith('file://') ? uri : null);

    if (!uri || Platform.OS === 'web' || uri.startsWith('file://')) {
      setOptimizedUri(uri);
      return () => {
        active = false;
      };
    }

    const prepareImage = async () => {
      try {
        const safeName = Array.from(uri).reduce(
          (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
          7
        ).toString(16);
        const localPath = `${FileSystem.cacheDirectory}recover-photo-${safeName}.jpg`;
        const optimizedPath = `${FileSystem.cacheDirectory}recover-photo-optimized-${safeName}.jpg`;
        await enqueueImageProcessing(async () => {
          const optimizedFile = await FileSystem.getInfoAsync(optimizedPath);
          if (optimizedFile.exists) {
            if (active) setOptimizedUri(optimizedPath);
            return;
          }

          const cachedFile = await FileSystem.getInfoAsync(localPath);
          const download = cachedFile.exists
            ? { uri: localPath }
            : await FileSystem.downloadAsync(uri, localPath);
          const manipulated = await ImageManipulator.manipulateAsync(
            download.uri,
            [{ resize: { width: 600 } }],
            { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG }
          );
          await FileSystem.copyAsync({ from: manipulated.uri, to: optimizedPath });
          if (active) setOptimizedUri(optimizedPath);
        });
      } catch (error) {
        console.warn('[OptimizedImage] Falha ao preparar imagem:', error.message);
        if (active) {
          setFailed(true);
          onError?.({ nativeEvent: { error: error.message } });
        }
      }
    };

    prepareImage();
    return () => {
      active = false;
    };
  }, [uri]);

  if (!optimizedUri || failed) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }]}>
        {!failed && <ActivityIndicator color="#9CA3AF" />}
      </View>
    );
  }

  return <Image {...props} source={{ uri: optimizedUri }} style={style} resizeMode={resizeMode} onLoad={onLoad} onError={onError} />;
};

export default OptimizedImage;
