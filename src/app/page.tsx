'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import BrushSelector from './components/BrushSelector'
import ImageUploader from './components/ImageUploader'

interface ImageVersion {
  url: string;
  timestamp: number;
  editedRegion?: string; // Changed to store mask data URL
}

interface YouTubeResult {
  title: string;
  thumbnail: {
    static: string;
  };
  link: string;
  channel: {
    name: string;
  };
  views: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<ImageVersion[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null)
  const [showEditInput, setShowEditInput] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([])
  const [showYoutubeResults, setShowYoutubeResults] = useState(false)

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

  const handleSelectionComplete = (maskUrl: string) => {
    setMaskDataUrl(maskUrl)
    setShowEditInput(true)
  }

  const handleEditRegion = async () => {
    if (!selectedImage || !maskDataUrl || !editPrompt) return;
    
    setLoading(true)
    try {
      const response = await fetch('/api/replicate/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: selectedImage,
          prompt: editPrompt,
          maskDataUrl: maskDataUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const data = await response.json();
      if (data.imageUrl) {
        const newVersion: ImageVersion = {
          url: data.imageUrl,
          timestamp: Date.now(),
          editedRegion: maskDataUrl
        };
        setGeneratedImages(prev => [...prev, newVersion]);
        setSelectedImage(data.imageUrl);
        setShowEditInput(false);
        setEditPrompt('');
        setMaskDataUrl(null);
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error editing image:', error);
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
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      setYoutubeResults(data);
      setShowYoutubeResults(true);
    } catch (error) {
      console.error('Error finding videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditWithAI = async (thumbnailUrl: string) => {
    try {
      // First, proxy the image through our API
      const proxyResponse = await fetch('/api/proxy/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: thumbnailUrl }),
      });
      
      const { dataUrl } = await proxyResponse.json();
      
      // Add to history when selecting a YouTube thumbnail
      const newVersion: ImageVersion = {
        url: dataUrl, // Use the data URL instead of the direct URL
        timestamp: Date.now(),
      }
      setGeneratedImages(prev => [...prev, newVersion]);
      setSelectedImage(dataUrl);
      setShowYoutubeResults(false);
    } catch (error) {
      console.error('Error processing thumbnail:', error);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">YouTube Thumbnail Generator</h1>
        
        {/* Quick Find Search - Moved to top */}
        <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <div className="max-w-2xl mx-auto">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Search YouTube Videos
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your video topic..."
                className="flex-1 p-3 border border-gray-600 rounded-lg text-gray-200 bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && findThumbnail()}
              />
              <button
                onClick={findThumbnail}
                disabled={loading || !searchQuery}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-colors whitespace-nowrap font-medium"
              >
                {loading ? 'Searching...' : 'Search Videos'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[300px_1fr_300px] gap-8">
          {/* Left Sidebar - Controls */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Upload Image</h2>
              <ImageUploader onImageSelect={handleImageUpload} />
            </div>

            {/* Generate Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Generate Custom</h2>
              <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your thumbnail in detail..."
                  className="w-full p-3 border border-gray-600 rounded-lg h-24 resize-none text-gray-200 bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={generateImage}
                  disabled={loading || !prompt}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors font-medium"
                >
                  {loading ? 'Generating...' : 'Generate Custom'}
                </button>
              </div>
            </div>
          </div>

          {/* Center - Preview & Edit or YouTube Results */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            {showYoutubeResults ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-white">YouTube Results</h2>
                <div className="grid grid-cols-2 gap-4">
                  {youtubeResults.map((result, index) => (
                    <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800">
                      <div className="relative aspect-video">
                        <Image
                          src={result.thumbnail.static}
                          alt={result.title}
                          fill
                          className="object-cover rounded-lg"
                          unoptimized
                        />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm text-white line-clamp-2">{result.title}</h3>
                        <p className="text-xs text-gray-500">{result.channel.name}</p>
                        <p className="text-xs text-gray-500">{result.views.toLocaleString()} views</p>
                        <button
                          onClick={() => handleEditWithAI(result.thumbnail.static)}
                          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Edit with AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              selectedImage ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Preview & Paint Region</h2>
                  <BrushSelector 
                    ref={previewRef}
                    imageUrl={selectedImage} 
                    onSelectionComplete={handleSelectionComplete}
                  />
                  {maskDataUrl && showEditInput && (
                    <div className="mt-4 space-y-4">
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Describe how you want to edit the selected region..."
                        className="w-full p-3 border border-gray-600 rounded-lg h-24 resize-none text-gray-200 bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleEditRegion}
                        disabled={loading || !editPrompt}
                        className="w-full p-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors font-medium"
                      >
                        {loading ? 'Editing...' : 'Edit Region'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>Upload or generate an image to start editing</p>
                </div>
              )
            )}
          </div>

          {/* Right Sidebar - Versions */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 h-fit">
            <h2 className="text-xl font-semibold mb-4 text-white">Versions</h2>
            <div className="space-y-3">
              {generatedImages.map((image, index) => (
                <div
                  key={index}
                  className={`relative aspect-video border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImage === image.url ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-700 hover:ring-2 hover:ring-blue-400 hover:border-transparent'
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-700/70 text-gray-200 text-xs p-1.5">
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
