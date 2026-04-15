import cloudinary from '../config/cloudinary';

export const uploadImage = (buffer: Buffer, placeSlug: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error('Image buffer is required for upload.'));
    }
    if (!placeSlug || placeSlug.trim() === '') {
      return reject(new Error('Valid placeSlug is required to determine upload folder.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `scrollbook/${placeSlug}`,
      },
      (error, result) => {
        if (error) return reject(error);
        if (result) return resolve(result.secure_url);
        reject(new Error('Unknown Cloudinary upload Error'));
      }
    );

    uploadStream.end(buffer);
  });
};
