import { launchImageLibrary } from 'react-native-image-picker';
import { pick } from 'react-native-document-picker';
import { Linking, Platform } from 'react-native';
import { compressImage } from './imageCompression';

// Safe Platform accessor for web environments
function getPlatformOS(): string {
  try {
    const { Platform } = require('react-native');
    return Platform?.OS || 'web';
  } catch {
    return 'web';
  }
}

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?.*)?$/i;
const DATA_URI_PATTERN = /^data:([^;,]+)(;base64)?,/i;
const IMAGE_PICKER_QUALITY = 0.4;

// Returns true when the provided string can be rendered as an image preview.
export function isImageMediaUri(value?: string | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('content:') ||
    trimmed.startsWith('ph:') ||
    IMAGE_FILE_PATTERN.test(trimmed) ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  );
}

// Flattens attachment values into a unique list of URIs.
export function getAttachmentUris(
  attachments?: Array<string | { url?: string | null }> | null
): string[] {
  if (!attachments?.length) {
    return [];
  }

  const uris = attachments
    .map(attachment =>
      typeof attachment === 'string' ? attachment : attachment?.url || ''
    )
    .map(value => value.trim())
    .filter(Boolean);

  return uris.filter((value, index) => uris.indexOf(value) === index);
}

// Builds a short admin-friendly attachment label from a URI or data URI.
export function getAttachmentLabel(value?: string | null): string {
  const normalizedValue = (value || '').trim();
  if (!normalizedValue) {
    return 'Attachment';
  }

  const dataUriMatch = normalizedValue.match(DATA_URI_PATTERN);
  if (dataUriMatch?.[1]) {
    const mimeType = dataUriMatch[1].toLowerCase();
    const mimeSubtype = mimeType.split('/')[1] || 'file';
    return `${mimeSubtype.toUpperCase()} file`;
  }

  const sanitizedValue = normalizedValue.split('#')[0] || normalizedValue;
  const pathWithoutQuery = sanitizedValue.split('?')[0] || sanitizedValue;
  const segments = pathWithoutQuery.split('/');
  const lastSegment = segments[segments.length - 1] || pathWithoutQuery;

  try {
    return decodeURIComponent(lastSegment) || 'Attachment';
  } catch {
    return lastSegment || 'Attachment';
  }
}

// Opens local, remote, or data URI attachments in the most compatible way available.
export async function openAttachmentUri(uri: string): Promise<void> {
  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    throw new Error('Attachment URI is empty.');
  }

  if (getPlatformOS() === 'web' && typeof window !== 'undefined') {
    const newWindow = window.open(normalizedUri, '_blank', 'noopener,noreferrer');
    if (!newWindow && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = normalizedUri;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
    return;
  }

  await Linking.openURL(normalizedUri);
}

// Returns the best available image/media URI from a primary field plus attachments.
export function getPrimaryReportMediaUri(
  mediaFile?: string | null,
  attachments?: Array<string | { url?: string | null }> | null
): string | null {
  const candidates = [
    (mediaFile || '').trim(),
    ...getAttachmentUris(attachments),
  ].filter(Boolean);

  return candidates.find(isImageMediaUri) || candidates[0] || null;
}

// Opens the device photo picker and returns a persistable image URI/data URI.
export async function pickImageFromDevice(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event: any) => {
          resolve(event.target.result);
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  return new Promise((resolve) => {
    const options: any = {
      mediaType: 'photo',
      includeBase64: true,
      quality: IMAGE_PICKER_QUALITY,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.errorCode) {
        resolve(null);
        return;
      }

      const asset = response.assets?.[0];
      if (!asset) {
        resolve(null);
        return;
      }

      if (asset.base64) {
        const imageDataUri = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
        const optimizedImage = await compressImage(imageDataUri);
        resolve(optimizedImage || imageDataUri);
      } else if (asset.uri) {
        resolve(asset.uri);
      } else {
        resolve(null);
      }
    });
  });
}

// Opens the device file picker for documents and returns a persistable file URI/data URI.
export async function pickDocumentFromDevice(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event: any) => {
          resolve(event.target.result);
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  try {
    const result = await pick({
      presentationStyle: 'formSheet',
      copyTo: 'cachesDirectory',
    });

    if (!result || result.length === 0) {
      return null;
    }

    const asset = result[0] as any;
    if (asset.base64) {
      return `data:${asset.mimeType || 'application/octet-stream'};base64,${asset.base64}`;
    }

    return asset.uri;
  } catch (error) {
    if (error instanceof Error && error.message === 'User cancelled document picker') {
      return null;
    }
    throw error;
  }
}
