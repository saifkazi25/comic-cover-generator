// app/api/cloudinary-upload/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { fileBase64, publicId, folder } = await req.json();

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return NextResponse.json({ error: 'fileBase64 is required' }, { status: 400 });
    }

    const upload = () =>
      new Promise<any>((resolve, reject) => {
        const opts: any = {
          resource_type: 'image',
          folder: folder || 'comic-exports',
        };
        if (publicId) opts.public_id = publicId;

        const stream = cloudinary.uploader.upload_stream(opts, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });

        // fileBase64 can be a data URL or just base64
        const base64Data = fileBase64.includes('base64,')
          ? fileBase64.split('base64,')[1]
          : fileBase64;
        const buffer = Buffer.from(base64Data, 'base64');
        stream.end(buffer);
      });

    const result = await upload();
    return NextResponse.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
