import { supabase } from './supabaseClient';

export type FileType = 'license' | 'vehicle' | 'insurance';

export async function uploadFile(file: File, type: FileType): Promise<string> {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Get file extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `driver-documents/${fileName}`;

    // Log the upload attempt
    console.log(`Uploading ${type} file: ${fileName}`);

    // Check if bucket exists and create it if needed
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'driver-documents');
    
    if (!bucketExists) {
      console.log('Creating driver-documents bucket');
      const { error: bucketError } = await supabase.storage.createBucket('driver-documents', {
        public: true
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        throw new Error(`Failed to create storage bucket: ${bucketError.message}`);
      }
    }

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('driver-documents')
      .getPublicUrl(filePath);

    console.log(`Successfully uploaded ${type} file, URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
}
