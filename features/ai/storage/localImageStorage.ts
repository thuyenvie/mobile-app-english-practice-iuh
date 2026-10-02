import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImagePickerAsset } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const STORAGE_KEY = '@ai-question-images-v1';
const IMAGE_DIRECTORY = `${FileSystem.documentDirectory || ''}ai-question-images`;

type ImageIndex = Record<string, string>;

async function readIndex(): Promise<ImageIndex> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return {};
  try {
    return JSON.parse(value) as ImageIndex;
  } catch {
    return {};
  }
}

export async function saveLocalQuestionImage(
  requestId: string,
  asset: ImagePickerAsset,
): Promise<string> {
  let storedUri = asset.uri;

  if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
    const extension = imageExtension(asset);
    storedUri = `${IMAGE_DIRECTORY}/${requestId}.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: storedUri });
  }

  const index = await readIndex();
  index[requestId] = storedUri;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  return storedUri;
}

export async function getLocalQuestionImages(requestIds: string[]): Promise<Record<string, string>> {
  const index = await readIndex();
  return requestIds.reduce<Record<string, string>>((result, requestId) => {
    if (index[requestId]) result[requestId] = index[requestId];
    return result;
  }, {});
}

function imageExtension(asset: ImagePickerAsset) {
  const fileExtension = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fileExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
    return fileExtension;
  }
  if (asset.mimeType === 'image/png') return 'png';
  if (asset.mimeType === 'image/webp') return 'webp';
  return 'jpg';
}
