// ImageKit client-side configuration
const imagekitUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT
const imagekitPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY

if (!imagekitUrlEndpoint || !imagekitPublicKey) {
  console.warn('ImageKit configuration missing. Image uploads will not work.')
}

// ImageKit configuration for client-side usage
export const imagekitConfig = {
  urlEndpoint: imagekitUrlEndpoint || '',
  publicKey: imagekitPublicKey || '',
  isConfigured: !!(imagekitUrlEndpoint && imagekitPublicKey),
  uploadEndpoint: imagekitUrlEndpoint ? `${imagekitUrlEndpoint}/api/v1/files/upload` : ''
}

// For client-side uploads, we'll use fetch API instead of the ImageKit SDK
// This avoids bundling issues and gives us more control
export const createImageKitUploadUrl = (transformations?: string) => {
  if (!imagekitConfig.isConfigured) return '';

  const base = imagekitConfig.urlEndpoint;
  return transformations ? `${base}/tr:${transformations}` : base;
}

export const getImageKitTransformationUrl = (originalUrl: string, transformations: string) => {
  if (!originalUrl.includes('ik.imagekit.io')) return originalUrl;

  // Insert transformations into ImageKit URL
  return originalUrl.replace('ik.imagekit.io/', `ik.imagekit.io/tr:${transformations}/`);
}