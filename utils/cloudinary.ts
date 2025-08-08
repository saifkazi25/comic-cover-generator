import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function isCloudinaryUrl(url: string): boolean {
  // You can tweak this if your Cloudinary domain ever changes
  return url.includes('res.cloudinary.com');
}

export async function uploadImageFromUrl(imageUrl: string, type: 'cover' | 'panel' = 'cover'): Promise<string> {
  try {
    // Prevent accidental double-upload of Cloudinary images
    if (isCloudinaryUrl(imageUrl)) {
      console.log(`[Cloudinary] Input is already a Cloudinary URL, skipping upload: ${imageUrl}`);
      return imageUrl;
    }

    // Only allow cover images to be uploaded in 'comic-covers' folder
    const folder = type === 'cover' ? 'comic-covers' : 'comic-panels';

    // Build a unique, descriptive filename
    const urlParts = imageUrl.split('/');
    const fileNameGuess = urlParts[urlParts.length - 1].split('?')[0].replace(/\.[^/.]+$/, "");
    const timestamp = Date.now();

    const publicId = `${fileNameGuess}_${timestamp}`;

    const result = await cloudinary.v2.uploader.upload(imageUrl, {
      folder,
      public_id: publicId,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    });

    console.log(`[Cloudinary] Uploaded ${type} image:`, result.secure_url);
    return result.secure_url;
  } catch (error: any) {
    console.error(`[Cloudinary] ❌ Upload failed for image: ${imageUrl}`);
    console.error(error);
    throw new Error('Failed to upload image to Cloudinary.');
  }
}
