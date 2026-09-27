import JSZip from 'jszip';
import { Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export interface ExportablePhoto {
  id?: string;
  uri: string;
  name?: string;
  date?: string;
  filename?: string;
}

function sanitizeName(value?: string, fallback = 'photo'): string {
  if (!value) return fallback;
  return value
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}

function getExtensionFromMimeOrUri(uri: string): string {
  if (uri.startsWith('data:image/png')) return 'png';
  if (uri.startsWith('data:image/webp')) return 'webp';
  if (uri.startsWith('data:image/gif')) return 'gif';
  if (uri.startsWith('data:image/svg')) return 'svg';
  if (uri.startsWith('data:image/jpeg') || uri.startsWith('data:image/jpg')) return 'jpg';

  const clean = uri.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

export async function exportPhotosAsZip(
  photos: ExportablePhoto[],
  zipFilename = 'volunteer-photos.zip'
): Promise<boolean> {
  if (!photos || photos.length === 0) {
    Alert.alert('No Photos', 'There are no photos available to export.');
    return false;
  }

  try {
    const zip = new JSZip();
    const folder = zip.folder('photos') || zip;
    let addedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const item = photos[i];
      const uri = (item.uri || '').trim();
      if (!uri) continue;

      const ext = getExtensionFromMimeOrUri(uri);
      const safeOwner = sanitizeName(item.name, 'volunteer');
      const safeDate = sanitizeName(item.date, '');
      const baseFilename = item.filename
        ? sanitizeName(item.filename)
        : `photo-${String(i + 1).padStart(2, '0')}-${safeOwner}${safeDate ? `-${safeDate}` : ''}.${ext}`;

      if (uri.startsWith('data:image/')) {
        const commaIndex = uri.indexOf(',');
        if (commaIndex !== -1) {
          const base64Data = uri.slice(commaIndex + 1);
          folder.file(baseFilename, base64Data, { base64: true });
          addedCount++;
        }
      } else {
        try {
          const res = await fetch(uri);
          if (res.ok) {
            const blob = await res.blob();
            folder.file(baseFilename, blob);
            addedCount++;
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch photo at ${uri}:`, fetchErr);
        }
      }
    }

    if (addedCount === 0) {
      Alert.alert('Export Failed', 'None of the photo files could be bundled.');
      return false;
    }

    const finalZipName = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;

    if (Platform.OS === 'web' || typeof document !== 'undefined') {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalZipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    }

    // Native environment
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const targetPath = `${RNFS.CachesDirectoryPath}/${finalZipName}`;
    await RNFS.writeFile(targetPath, zipBase64, 'base64');
    await Share.open({
      url: `file://${targetPath}`,
      type: 'application/zip',
      filename: finalZipName,
    });
    return true;
  } catch (error: any) {
    if (error?.message === 'User did not share') {
      return true;
    }
    console.error('Failed to export photos as ZIP:', error);
    Alert.alert('Export Error', error?.message || 'Unable to batch export photos.');
    return false;
  }
}
