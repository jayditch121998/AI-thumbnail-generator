'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageUploaderProps {
  onImageSelect: (imageUrl: string) => void
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.includes('image/')) {
      alert('Please upload an image file')
      return
    }

    // Convert the file to a data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageSelect(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className="text-gray-600">
            <p>Drag and drop an image here, or click to select</p>
            <p className="text-sm">Supports: JPG, PNG, WebP</p>
          </div>
        </div>
      </div>
    </div>
  )
} 