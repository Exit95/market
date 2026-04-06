import storage from '@/lib/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const uploadService = {
  async uploadImage(uri: string): Promise<string> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);

    const token = await storage.getItem('access_token');
    const response = await fetch(`${API_URL}/api/uploads/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload fehlgeschlagen');
    const data = await response.json();
    return data.url;
  },
};
