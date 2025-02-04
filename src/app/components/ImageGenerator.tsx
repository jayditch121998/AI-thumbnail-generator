'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt) return;

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

      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white">
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-white text-black"
          placeholder="Enter your prompt here..."
          rows={4}
        />

        <button
          onClick={generateImage}
          disabled={isLoading || !prompt}
          className="w-full p-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>

        {error && (
          <div className="p-2 text-red-500 border border-red-500 rounded">
            {error}
          </div>
        )}

        {imageUrl && (
          <div className="mt-4">
            <img
              src={imageUrl}
              alt="Generated image"
              className="w-full rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
} 