import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImagePickerAsset } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { assertSessionGeneration, requireAccount } from '@/lib/auth/sessionStore';

const storageKey = (subject: string) => '@ai-question-images-v2:' + encodeURIComponent(subject);
const IMAGE_DIRECTORY = `${FileSystem.documentDirectory || ''}ai-question-images`;

type ImageIndex = Record<string, string>;

async function readIndex(subject: string): Promise<ImageIndex> {
  const value = await AsyncStorage.getItem(storageKey(subject));
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
  const session = requireAccount();
  const subject = session.subject!;
  let storedUri = asset.uri;

  if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
    const extension = imageExtension(asset);
    storedUri = IMAGE_DIRECTORY + "/" + encodeURIComponent(subject) + "-" + encodeURIComponent(requestId) + "." + extension;
    await FileSystem.copyAsync({ from: asset.uri, to: storedUri });
  }

  assertSessionGeneration(session.generation);
  const index = await readIndex(subject);
  assertSessionGeneration(session.generation);
  index[requestId] = storedUri;
  await AsyncStorage.setItem(storageKey(subject), JSON.stringify(index));
  return storedUri;
}

export async function getLocalQuestionImages(requestIds: string[]): Promise<Record<string, string>> {
  const session = requireAccount();
  const index = await readIndex(session.subject!);
  assertSessionGeneration(session.generation);
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
