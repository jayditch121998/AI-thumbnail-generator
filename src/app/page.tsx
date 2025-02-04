'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import ImageSelector from './components/ImageSelector'
import ImageUploader from './components/ImageUploader'

interface ImageVersion {
  url: string;
  timestamp: number;
  editedRegion?: { x: number; y: number; width: number; height: number };
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<ImageVersion[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showEditInput, setShowEditInput] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const generateImage = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })
      const data = await response.json()
      if (data) {
        const newVersion: ImageVersion = {
          url: data[0],
          timestamp: Date.now(),
        }
        setGeneratedImages(prev => [...prev, newVersion])
        setSelectedImage(data[0])
      }
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (newSelection: { x: number; y: number; width: number; height: number }) => {
    setSelection(newSelection)
    setShowEditInput(true)
  }

  const handleEditRegion = async () => {
    if (!selectedImage || !selection || !editPrompt || !previewRef.current) return;
    
    setLoading(true)
    try {
      // Get image dimensions using a Promise
      const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = reject;
        img.src = selectedImage;
      });

      const previewRect = previewRef.current.getBoundingClientRect();

      // Scale the selection to match the actual image dimensions
      const scaledSelection = {
        x: Math.round((selection.x * imageDimensions.width) / previewRect.width),
        y: Math.round((selection.y * imageDimensions.height) / previewRect.height),
        width: Math.round((selection.width * imageDimensions.width) / previewRect.width),
        height: Math.round((selection.height * imageDimensions.height) / previewRect.height)
      };

      const response = await fetch('/api/replicate/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: selectedImage,
          prompt: editPrompt,
          selection: scaledSelection,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const data = await response.json();
      if (data && data[0]) {
        const newVersion: ImageVersion = {
          url: data[0],
          timestamp: Date.now(),
          editedRegion: selection
        };
        setGeneratedImages(prev => [...prev, newVersion]);
        setSelectedImage(data[0]);
        setShowEditInput(false);
        setEditPrompt('');
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      // Add error notification here if you want
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    setSelectedImage(imageUrl)
    // Add the uploaded image to the versions
    const newVersion: ImageVersion = {
      url: imageUrl,
      timestamp: Date.now(),
    }
    setGeneratedImages(prev => [...prev, newVersion])
  }

  const findThumbnail = async () => {
    if (!searchQuery) return;
    
    setLoading(true)
    try {
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `A YouTube thumbnail for a video about "${searchQuery}". Professional, eye-catching, high quality` 
        }),
      })
      const data = await response.json()
      if (data) {
        const newVersion: ImageVersion = {
          url: data[0],
          timestamp: Date.now(),
        }
        setGeneratedImages(prev => [...prev, newVersion])
        setSelectedImage(data[0])
      }
    } catch (error) {
      console.error('Error finding thumbnail:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">YouTube Thumbnail Generator</h1>
        
        <div className="grid grid-cols-[300px_1fr_300px] gap-8">
          {/* Left Sidebar - Controls */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Image</h2>
              <ImageUploader onImageSelect={handleImageUpload} />
            </div>

            {/* Generate Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Generate Thumbnail</h2>
              <div className="space-y-4">
                {/* Quick Find */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quick Find
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter your video topic..."
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 bg-white"
                  />
                  <button
                    onClick={findThumbnail}
                    disabled={loading || !searchQuery}
                    className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-colors"
                  >
                    {loading ? 'Finding...' : 'Find Thumbnail'}
                  </button>
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your thumbnail in detail..."
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 bg-white"
                  />
                  <button
                    onClick={generateImage}
                    disabled={loading || !prompt}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    {loading ? 'Generating...' : 'Generate Custom'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Preview & Edit */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            {selectedImage ? (
              <>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Preview & Select Region</h2>
                <ImageSelector 
                  ref={previewRef}
                  imageUrl={selectedImage} 
                  onSelectionChange={handleSelectionChange}
                />
                {selection && showEditInput && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Selected Region</h3>
                      <p className="text-sm text-gray-600">
                        Position: (x: {Math.round(selection.x)}, y: {Math.round(selection.y)})
                        <br />
                        Size: {Math.round(selection.width)} × {Math.round(selection.height)}
                      </p>
                    </div>
                    <div>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Describe how to edit this region..."
                        className="w-full p-3 border border-gray-300 rounded-lg h-20 resize-none text-gray-800 bg-white"
                      />
                      <button
                        onClick={handleEditRegion}
                        disabled={loading || !editPrompt}
                        className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 transition-colors"
                      >
                        {loading ? 'Editing...' : 'Edit Region'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Upload or generate an image to start editing</p>
              </div>
            )}
          </div>

          {/* Right Sidebar - Versions */}
          <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Versions</h2>
            <div className="space-y-3">
              {generatedImages.map((image, index) => (
                <div
                  key={index}
                  className={`relative aspect-video border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImage === image.url ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'
                  }`}
                  onClick={() => setSelectedImage(image.url)}
                >
                  <Image
                    src={image.url}
                    alt={`Version ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                    {image.editedRegion ? 'Edited' : 'Generated'}{' '}
                    {new Date(image.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {generatedImages.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No images generated yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
