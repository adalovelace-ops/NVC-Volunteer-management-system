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
  return (
    value
      .trim()
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

function ensureJpegFilename(filename?: string, index = 1, owner = 'volunteer', date = ''): string {
  let base = filename?.trim();
  if (base) {
    base = base.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
    base = base.replace(/\.(jpe?g|png|webp|gif|svg|bmp|tiff?)$/i, '');
  }
  if (!base) {
    const safeOwner = sanitizeName(owner, 'volunteer');
    const safeDate = sanitizeName(date, '');
    base = `photo-${String(index).padStart(2, '0')}-${safeOwner}${safeDate ? `-${safeDate}` : ''}`;
  }
  return `${base}.jpeg`;
}

/**
 * Converts any image (data URI, blob, or remote URL) to true JPEG format.
 * Uses HTML5 Canvas on web/browser with a solid white background to prevent
 * transparent PNG/SVG elements from rendering with black backgrounds in JPEG.
 */
async function convertToJpeg(uri: string): Promise<{ data: Blob | string; isBase64: boolean }> {
  // If running in browser or web environment with Canvas available
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width || 800;
          const height = img.naturalHeight || img.height || 600;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context unavailable');
          }

          // Solid white background for transparency conversion
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          if (canvas.toBlob) {
            canvas.toBlob(
              blob => {
                if (blob) {
                  resolve({ data: blob, isBase64: false });
                } else {
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                  const base64 = dataUrl.split(',')[1] || '';
                  resolve({ data: base64, isBase64: true });
                }
              },
              'image/jpeg',
              0.92
            );
          } else {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const base64 = dataUrl.split(',')[1] || '';
            resolve({ data: base64, isBase64: true });
          }
        } catch (canvasErr) {
          fallbackFetchOrBase64(uri).then(resolve).catch(reject);
        }
      };

      img.onerror = () => {
        fallbackFetchOrBase64(uri).then(resolve).catch(reject);
      };

      img.src = uri;
    });
  }

  return fallbackFetchOrBase64(uri);
}

async function fallbackFetchOrBase64(uri: string): Promise<{ data: Blob | string; isBase64: boolean }> {
  if (uri.startsWith('data:')) {
    const commaIndex = uri.indexOf(',');
    const base64 = commaIndex !== -1 ? uri.slice(commaIndex + 1) : uri;
    return { data: base64, isBase64: true };
  }

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch photo at ${uri}: ${res.statusText}`);
  }
  const blob = await res.blob();
  return { data: blob, isBase64: false };
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
    let addedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const item = photos[i];
      const uri = (item.uri || '').trim();
      if (!uri) continue;

      const jpegFilename = ensureJpegFilename(item.filename, i + 1, item.name, item.date);

      try {
        const { data, isBase64 } = await convertToJpeg(uri);
        if (isBase64) {
          zip.file(jpegFilename, data as string, { base64: true });
        } else {
          zip.file(jpegFilename, data as Blob);
        }
        addedCount++;
      } catch (itemErr) {
        console.warn(`Failed to process photo [${i + 1}] for JPEG ZIP export:`, itemErr);
      }
    }

    if (addedCount === 0) {
      Alert.alert('Export Failed', 'None of the photo files could be bundled into JPEG format.');
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

    // Native environment (Android / iOS)
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
    console.error('Failed to export photos as JPEG ZIP:', error);
    Alert.alert('Export Error', error?.message || 'Unable to batch export photos as JPEG ZIP.');
    return false;
  }
}
