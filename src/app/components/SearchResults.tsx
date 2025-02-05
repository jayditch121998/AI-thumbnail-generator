'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function SearchResults() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Search input */}
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Your results mapping */}
        </div>
      )}
    </div>
  );
} 