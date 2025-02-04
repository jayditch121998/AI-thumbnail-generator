import { useState } from 'react';

interface UseImageGenerationProps {
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: string) => void;
}

export const useImageGeneration = ({ onSuccess, onError }: UseImageGenerationProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage(data.imageUrl);
      onSuccess?.(data.imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const editImage = async (prompt: string, imageUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/replicate/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, image: imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }

      setGeneratedImage(data.imageUrl);
      onSuccess?.(data.imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateImage,
    editImage,
    isLoading,
    error,
    generatedImage,
  };
}; 