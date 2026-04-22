import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';
import { logger } from '../shared/utils/logger';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ url: string; publicId: string; thumbnailUrl?: string }> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `verifact/${folder}`,
    resource_type: resourceType,
    quality: 'auto',
    fetch_format: 'auto',
  });

  const thumbnailUrl = resourceType === 'video'
    ? cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ width: 400, height: 300, crop: 'fill' }],
      })
    : undefined;

  logger.info(`Media uploaded to Cloudinary: ${result.public_id}`);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    thumbnailUrl,
  };
};

export const deleteFromCloudinary = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  logger.info(`Media deleted from Cloudinary: ${publicId}`);
};
