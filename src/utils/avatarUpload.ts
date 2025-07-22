
import { supabase } from "@/integrations/supabase/client";

export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Create a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${timestamp}.${fileExtension}`;

    console.log('[avatarUpload] Uploading file:', fileName);

    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[avatarUpload] Upload error:', error);
      return null;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log('[avatarUpload] Upload successful, public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[avatarUpload] Unexpected error:', error);
    return null;
  }
};

export const deleteAvatar = async (avatarUrl: string, userId: string): Promise<boolean> => {
  try {
    // Extract the file path from the URL
    const urlParts = avatarUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${userId}/${fileName}`;

    console.log('[avatarUpload] Deleting file:', filePath);

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.error('[avatarUpload] Delete error:', error);
      return false;
    }

    console.log('[avatarUpload] Delete successful');
    return true;
  } catch (error) {
    console.error('[avatarUpload] Unexpected delete error:', error);
    return false;
  }
};
