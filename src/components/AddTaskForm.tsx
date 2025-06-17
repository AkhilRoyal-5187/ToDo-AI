// src/components/AddTaskForm.tsx
'use client'; // This component will use client-side interactivity (useState)

import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react'; 
import Input from './ui/Input';
import Button from './ui/Button';

interface AddTaskFormProps {
  onAddTask: (text: string) => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask }) => {
  const [showInput, setShowInput] = useState(false);
  const [taskText, setTaskText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim()) {
      onAddTask(taskText.trim());
      setTaskText(''); // Clear input
      setShowInput(false); // Hide input after adding
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      {!showInput ? (
        <Button
          onClick={() => setShowInput(true)}
          variant="ghost"
          size="lg"
          className="group text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {/* Using a larger PlusCircle icon for the add button */}
          <PlusCircle className="w-10 h-10 group-hover:scale-105 transition-transform" />
          <span className="sr-only">Add New Task</span>
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-lg space-x-2">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            className="flex-grow"
            autoFocus // Auto-focus when input appears
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowInput(false)}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
};

export default AddTaskForm;