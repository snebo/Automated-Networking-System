'use client';

import { useEffect } from 'react';

export default function ApiDocsPage() {
  useEffect(() => {
    // Redirect to Swagger UI
    window.location.href = 'http://localhost:3000/api';
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to API Documentation</h2>
        <p className="text-gray-600">
          You are being redirected to our Swagger UI documentation...
        </p>
        <p className="text-sm text-gray-500 mt-4">
          If you are not redirected automatically, 
          <a href="http://localhost:3000/api" className="text-blue-600 hover:underline ml-1">
            click here
          </a>
        </p>
      </div>
    </div>
  );
}