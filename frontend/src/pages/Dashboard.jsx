import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
          Welcome back, {user?.email || 'User'}!
        </p>
      </div>
    </div>
  );
} 