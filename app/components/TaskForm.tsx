"use client";

import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { useChannelMembership } from '@/hooks/useChannelMembership';

interface TaskFormProps {
  groupId: string;
}

export default function TaskForm({ groupId }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { isMember, isLoading } = useChannelMembership();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !db) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        completed: false,
        createdAt: new Date(),
        groupId,
      });

      setTitle('');
      setError(null);
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isMember) {
    return (
      <div className="text-center p-4 bg-yellow-50 rounded-md">
        <p className="text-yellow-700">Please subscribe to our channel to add tasks</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new task"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Add Task
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}