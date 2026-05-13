/**
 * Shared image compression utility for upload flows.
 * Keeps the existing data-URI storage model, but shrinks images aggressively enough
 * to reduce shared-storage payload size and backend egress.
 */

const MAX_IMAGE_SIZE_KB = 180;
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 1280;
const SCALE_STEPS = [1, 0.92, 0.84, 0.76, 0.68];
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

function canUseCanvasCompression(): boolean {
  return typeof Image !== 'undefined' && typeof document !== 'undefined';
}

function getDataUrlMimeType(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,/i);
  return match?.[1]?.toLowerCase() || null;
}

function getTargetDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
    return { width, height };
  }

  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export async function compressImage(
  imageUri: string,
  maxSizeKB: number = MAX_IMAGE_SIZE_KB
): Promise<string | null> {
  try {
    if (!imageUri.startsWith('data:')) {
      return imageUri;
    }

    if (getImageSizeKB(imageUri) <= maxSizeKB) {
      return imageUri;
    }

    if (!canUseCanvasCompression()) {
      return imageUri;
    }

    return await compressBase64Image(imageUri, maxSizeKB);
  } catch (error) {
    console.error('Image compression failed:', error);
    return imageUri;
  }
}

async function compressBase64Image(
  dataUrl: string,
  maxSizeKB: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      const originalSizeKB = getImageSizeKB(dataUrl);
      const sourceMimeType = getDataUrlMimeType(dataUrl);
      const shouldKeepPng = sourceMimeType === 'image/png' && originalSizeKB <= maxSizeKB * 1.2;
      const outputMimeType = shouldKeepPng ? 'image/png' : 'image/jpeg';
      const { width: baseWidth, height: baseHeight } = getTargetDimensions(img.width, img.height);
      let bestCandidate = dataUrl;
      let bestCandidateSizeKB = originalSizeKB;

      for (const scaleFactor of SCALE_STEPS) {
        const width = Math.max(1, Math.floor(baseWidth * scaleFactor));
        const height = Math.max(1, Math.floor(baseHeight * scaleFactor));

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        if (outputMimeType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        for (const quality of QUALITY_STEPS) {
          try {
            const compressed =
              outputMimeType === 'image/png'
                ? canvas.toDataURL(outputMimeType)
                : canvas.toDataURL(outputMimeType, quality);
            const sizeKB = getImageSizeKB(compressed);

            if (sizeKB < bestCandidateSizeKB) {
              bestCandidate = compressed;
              bestCandidateSizeKB = sizeKB;
            }

            if (sizeKB <= maxSizeKB) {
              resolve(compressed);
              return;
            }
          } catch {
            resolve(bestCandidate);
            return;
          }
        }
      }

      resolve(bestCandidate);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function getImageSizeKB(dataUrl: string): number {
  try {
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) {
      return 0;
    }

    return (base64Part.length * 3) / 4 / 1024;
  } catch {
    return 0;
  }
}
