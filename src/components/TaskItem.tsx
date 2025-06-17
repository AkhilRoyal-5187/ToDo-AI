// src/components/TaskItem.tsx
'use client';

import React, { useState } from 'react';
import { Task } from '@/lib/types';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';
import Input from './ui/Input';
import { Edit2, Trash2, GripVertical } from 'lucide-react'; // Added GripVertical icon

// Dnd-kit imports for sortable items
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  // dnd-kit hook to make the item sortable
  const {
    attributes,
    listeners,
    setNodeRef, // Attach this ref to the draggable element
    transform,
    transition,
    isDragging, // To apply dragging styles
  } = useSortable({ id: task.id });

  // Apply transforms for positioning and transitions for smooth animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0, // Bring dragging item to front
    opacity: isDragging ? 0.7 : 1, // Make dragging item slightly transparent
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.4)' : 'none', // Add shadow when dragging
  };

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== task.text) {
      onEdit(task.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(task.text); // Revert changes
    }
  };

  return (
    <div
      ref={setNodeRef} // Attach the ref for dnd-kit
      style={style} // Apply dnd-kit styles
      className={`flex items-center p-4 rounded-lg bg-zinc-800 transition-colors duration-200
      ${task.completed ? 'opacity-60 text-zinc-400 line-through' : 'text-zinc-50'}
      task-row-spacing`}
    >
      {/* Drag handle for better UX */}
      <button
        className="mr-3 p-1 rounded-full text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
        {...attributes} // Essential for accessibility (keyboard dragging)
        {...listeners} // Essential for mouse dragging
      >
        <GripVertical size={20} />
        <span className="sr-only">Drag to reorder</span>
      </button>

      <Checkbox
        checked={task.completed}
        onChange={() => onToggleComplete(task.id)}
        className="mr-3"
      />

      {isEditing ? (
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-grow bg-zinc-700 border-zinc-600 text-zinc-50"
        />
      ) : (
        <span
          className="flex-grow cursor-pointer select-none" // select-none to prevent text selection during drag
          onDoubleClick={() => setIsEditing(true)}
        >
          {task.text}
        </span>
      )}

      <div className="flex items-center ml-4 space-x-2">
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-indigo-400"
          >
            <Edit2 size={16} />
            <span className="sr-only">Edit Task</span>
          </Button>
        )}
        <Button
          onClick={() => onDelete(task.id)}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-red-400"
        >
          <Trash2 size={16} />
          <span className="sr-only">Delete Task</span>
        </Button>
      </div>
    </div>
  );
};

export default TaskItem;