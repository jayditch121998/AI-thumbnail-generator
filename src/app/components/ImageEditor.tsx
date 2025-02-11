"use client";

import { useState, useRef } from "react";
import { useCallback } from "react";
import Image from "next/image";

interface ImageVersion {
  id: string;
  imageUrl: string;
  timestamp: Date;
  prompt?: string;
}

export default function ImageEditor() {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newVersion: ImageVersion = {
          id: Date.now().toString(),
          imageUrl: reader.result as string,
          timestamp: new Date(),
        };
        setVersions([...versions, newVersion]);
        setCurrentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/replicate/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      if (data.imageUrl) {
        const newVersion: ImageVersion = {
          id: Date.now().toString(),
          imageUrl: data.imageUrl,
          timestamp: new Date(),
          prompt,
        };
        setVersions([...versions, newVersion]);
        setCurrentImage(data.imageUrl);
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditRegion = async () => {
    if (!currentImage || !selection || !editPrompt) return;
    
    setIsGenerating(true);
    try {
      // Get the actual image dimensions
      const imageElement = imageRef.current?.querySelector('img');
      if (!imageElement) return;

      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate scale factors
      const scaleX = imageElement.naturalWidth / rect.width;
      const scaleY = imageElement.naturalHeight / rect.height;

      // Scale the selection to match actual image dimensions
      const scaledSelection = {
        x: Math.round(selection.x * scaleX),
        y: Math.round(selection.y * scaleY),
        width: Math.round(selection.width * scaleX),
        height: Math.round(selection.height * scaleY)
      };

      const response = await fetch("/api/replicate/edit-image", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: currentImage,
          prompt: editPrompt,
          selection: scaledSelection,
        }),
      });

      const data = await response.json();
      console.log('Edit response:', data);

      if (data.error) {
        throw new Error(data.details || data.error);
      }
      
      if (data.imageUrl) {
        const newVersion: ImageVersion = {
          id: Date.now().toString(),
          imageUrl: data.imageUrl,
          timestamp: new Date(),
          prompt: editPrompt,
        };
        setVersions(prev => [...prev, newVersion]);
        setCurrentImage(data.imageUrl);
        setSelection(null);
        setEditPrompt("");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      alert(error instanceof Error ? error.message : "Failed to edit image");
    } finally {
      setIsGenerating(false);
    }
  };

  const startSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get the actual image element
    const imageElement = imageRef.current.querySelector('img');
    if (!imageElement) return;

    // Calculate scale factors
    const scaleX = imageElement.naturalWidth / rect.width;
    const scaleY = imageElement.naturalHeight / rect.height;
    
    setIsSelecting(true);
    setStartPos({ x, y });
    setSelection({ 
      x: x * scaleX, 
      y: y * scaleY, 
      width: 0, 
      height: 0 
    });
  };

  const updateSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSelecting || !startPos || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const imageElement = imageRef.current.querySelector('img');
    if (!imageElement) return;

    // Calculate scale factors
    const scaleX = imageElement.naturalWidth / rect.width;
    const scaleY = imageElement.naturalHeight / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    const startX = startPos.x * scaleX;
    const startY = startPos.y * scaleY;

    setSelection({
      x: Math.min(startX, currentX) / scaleX,
      y: Math.min(startY, currentY) / scaleY,
      width: Math.abs(currentX - startX) / scaleX,
      height: Math.abs(currentY - startY) / scaleY,
    });
  }, [isSelecting, startPos]);

  const endSelection = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSelecting(false);
    setStartPos(null);
  };

  const preventDragHandler = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-800 rounded-xl shadow-xl">
      <div className="space-y-4">
        <div className="flex gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt to generate image..."
              className="flex-1 px-4 py-2 border rounded-lg bg-gray-700 text-white border-gray-600 placeholder-gray-400"
            />
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {currentImage && (
          <>
            <div
              ref={imageRef}
              className="relative border border-gray-700 rounded-lg overflow-hidden select-none"
              onMouseDown={startSelection}
              onMouseMove={updateSelection}
              onMouseUp={endSelection}
              onMouseLeave={endSelection}
              onDragStart={preventDragHandler}
              onDrag={preventDragHandler}
              onDragEnd={preventDragHandler}
            >
              <Image
                src={currentImage}
                alt="Current image"
                width={800}
                height={600}
                className="w-full h-auto pointer-events-none"
                draggable={false}
                unoptimized
                crossOrigin="anonymous"
              />
              {selection && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height,
                  }}
                />
              )}
            </div>

            {selection && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Enter prompt to edit selected region..."
                  className="flex-1 px-4 py-2 border rounded-lg bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                />
                <button
                  onClick={handleEditRegion}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700"
                >
                  {isGenerating ? "Editing..." : "Edit Region"}
                </button>
              </div>
            )}
          </>
        )}

        {versions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Version History</h3>
            <div className="grid grid-cols-4 gap-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-700 hover:bg-gray-600 transition-colors"
                  onClick={() => setCurrentImage(version.imageUrl)}
                >
                  <Image
                    src={version.imageUrl}
                    alt={`Version ${version.id}`}
                    width={200}
                    height={150}
                    className="w-full h-auto"
                    crossOrigin="anonymous"
                  />
                  <div className="p-2 text-xs">
                    {version.prompt && <p className="truncate text-gray-200">{version.prompt}</p>}
                    <p className="text-gray-400">
                      {version.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 