// src/components/TaskList.tsx
import React from 'react';
import { Task } from '@/lib/types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  // onReorder: (newOrder: Task[]) => void; // For drag and drop later
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
  onEdit,
}) => {
  if (tasks.length === 0) {
    return (
      <p className="text-center text-zinc-400 p-8">
        No tasks yet! Click the &apos;+&apos; button to add your first task.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-2xl mx-auto p-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

export default TaskList;