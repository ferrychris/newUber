import { supabase } from './supabaseClient';

export type FileType = 'license' | 'vehicle' | 'insurance';

export async function uploadFile(file: File, type: FileType): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `driver-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('driver-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}
