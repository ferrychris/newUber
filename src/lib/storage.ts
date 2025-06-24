import { supabase } from './supabaseClient';

export const uploadFile = async (file: File, type: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}_${Date.now()}.${fileExt}`;
  const filePath = `${type}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('driver-documents')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('driver-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
