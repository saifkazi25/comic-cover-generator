import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  try {
    const result = await cloudinary.v2.uploader.upload(imageUrl, {
      folder: 'comic-covers',
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    });

    return result.secure_url;
  } catch (error: any) {
    console.error('❌ Cloudinary upload failed:', error.message);
    throw new Error('Failed to upload image to Cloudinary.');
  }
}

