import { launchImageLibrary } from 'react-native-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
const PDF_FILE_PATTERN = /\.pdf(\?.*)?$/i;
const DOCUMENT_FILE_PATTERN = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf|zip)(\?.*)?$/i;
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

// Returns true when the provided string is a PDF document.
export function isPdfMediaUri(value?: string | null): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return trimmed.startsWith('data:application/pdf') || PDF_FILE_PATTERN.test(trimmed);
}

// Returns true when the provided string is any valid attachment URI (image, doc, PDF, blob, URL).
export function isAttachmentMediaUri(value?: string | null): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('content:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    DOCUMENT_FILE_PATTERN.test(trimmed) ||
    IMAGE_FILE_PATTERN.test(trimmed)
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
export function getAttachmentLabel(value?: string | null, fallbackLabel: string = 'Attachment'): string {
  const normalizedValue = (value || '').trim();
  if (!normalizedValue) {
    return fallbackLabel;
  }

  const nameMatch = normalizedValue.match(/;name=([^;]+)/i);
  if (nameMatch?.[1]) {
    try {
      return decodeURIComponent(nameMatch[1]);
    } catch {
      return nameMatch[1];
    }
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
    return decodeURIComponent(lastSegment) || fallbackLabel;
  } catch {
    return lastSegment || fallbackLabel;
  }
}

// Helper to convert base64 data URI to standard Blob
export function dataUriToBlob(dataUri: string): { blob: Blob; mime: string; extension: string } {
  const parts = dataUri.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const base64Data = parts[1] || '';
  const byteCharacters = atob(base64Data);
  const byteArrays: Uint8Array[] = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  
  const blob = new Blob(byteArrays as any, { type: mime });
  const ext = mime.split('/')[1]?.split('+')[0] || 'bin';
  return { blob, mime, extension: ext };
}

// Opens local, remote, blob, or data URI attachments in the most compatible way across Web & Mobile.
export async function openAttachmentUri(uri: string): Promise<void> {
  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    throw new Error('Attachment URI is empty.');
  }

  if (getPlatformOS() === 'web' && typeof window !== 'undefined') {
    // Handle data: URIs safely without triggering Chrome's about:blank#blocked
    if (normalizedUri.startsWith('data:')) {
      try {
        const { blob, mime, extension } = dataUriToBlob(normalizedUri);
        const blobUrl = URL.createObjectURL(blob);
        const isPdf = mime.includes('pdf');
        const isImg = mime.startsWith('image/');
        const defaultFilename = `document_${Date.now()}.${extension}`;
        const fileName = getAttachmentLabel(normalizedUri) !== 'Attachment' 
          ? getAttachmentLabel(normalizedUri) 
          : defaultFilename;

        if (isPdf || isImg) {
          const opened = window.open(blobUrl, '_blank');
          if (!opened) {
            // Popup blocked: download fallback
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } else {
          // General document (Word, Excel, Zip, etc.): direct download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Clean up blob URL after 60s
        setTimeout(() => {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 60000);
        return;
      } catch (err) {
        console.warn('[openAttachmentUri] Error creating blob URL:', err);
      }
    }

    // Standard HTTP/HTTPS or local object URL
    const opened = window.open(normalizedUri, '_blank', 'noopener,noreferrer');
    if (!opened && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = normalizedUri;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return;
  }

  // Mobile Native Platform (iOS / Android)
  if (normalizedUri.startsWith('data:')) {
    try {
      const Sharing = require('expo-sharing');
      const RNFS = require('react-native-fs');
      if (Sharing && RNFS) {
        const parts = normalizedUri.split(',');
        const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const ext = mime.split('/')[1]?.split('+')[0] || 'bin';
        const base64Data = parts[1] || '';
        const tempPath = `${RNFS.CachesDirectoryPath}/doc_${Date.now()}.${ext}`;
        await RNFS.writeFile(tempPath, base64Data, 'base64');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempPath, { mimeType: mime, dialogTitle: 'Open Document' });
          return;
        }
      }
    } catch (nativeError) {
      console.warn('[openAttachmentUri] Mobile data URI native handler fallback:', nativeError);
    }
  }

  try {
    await Linking.openURL(normalizedUri);
  } catch (linkError) {
    console.warn('[openAttachmentUri] Linking.openURL failed:', linkError);
    throw linkError;
  }
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
      input.style.display = 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(input);
      }

      let settled = false;
      const cleanup = () => {
        try {
          if (input.parentNode) {
            input.parentNode.removeChild(input);
          }
        } catch {}
      };

      const finish = (result: string | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          const rawDataUrl = event.target?.result as string;
          try {
            const compressed = await compressImage(rawDataUrl);
            finish(compressed || rawDataUrl);
          } catch {
            finish(rawDataUrl);
          }
        };
        reader.onerror = () => {
          finish(null);
        };
        reader.readAsDataURL(file);
      };

      input.oncancel = () => {
        finish(null);
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
      input.style.display = 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(input);
      }

      let settled = false;
      const cleanup = () => {
        try {
          if (input.parentNode) {
            input.parentNode.removeChild(input);
          }
        } catch {}
      };

      const finish = (result: string | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event: any) => {
          let dataUrl = event.target?.result as string;
          if (file.name && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const encodedName = encodeURIComponent(file.name);
            dataUrl = dataUrl.replace(';base64,', `;name=${encodedName};base64,`);
          }
          finish(dataUrl);
        };
        reader.onerror = () => {
          finish(null);
        };
        reader.readAsDataURL(file);
      };

      input.oncancel = () => {
        finish(null);
      };

      input.click();
    });
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return asset.uri;
  } catch (error) {
    console.warn('[pickDocumentFromDevice] Error picking document:', error);
    return null;
  }
}
