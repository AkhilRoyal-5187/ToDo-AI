// src/app/page.tsx
'use client';

import React from 'react';
import AddTaskForm from '@/components/AddTaskForm';
import TaskList from '@/components/TaskList';
import { useTasks } from '@/hooks/useTasks';

// Dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, // Helper to reorder arrays
  SortableContext, // Context for sortable items
  sortableKeyboardCoordinates, // Keyboard accessibility for sortable items
  verticalListSortingStrategy, // Strategy for vertical lists
} from '@dnd-kit/sortable';

export default function Home() {
  const { tasks, addTask, toggleTaskCompletion, deleteTask, editTask, reorderTasks } = useTasks();

  // Define sensors for DndContext
  const sensors = useSensors(
    useSensor(PointerSensor), // For mouse and touch interactions
    useSensor(KeyboardSensor, { // For keyboard accessibility
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler for when a drag operation ends
 // src/app/page.tsx (ONLY the handleDragEnd function)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Check if an item was actually moved
    if (active.id !== over?.id) {
      // Find the old and new index using the current 'tasks' state from useTasks hook
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const newIndex = tasks.findIndex(task => task.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Use arrayMove from dnd-kit/sortable to get the new ordered array
        const newOrderedTasks = arrayMove(tasks, oldIndex, newIndex);

        // Call the reorderTasks function from our useTasks hook to update the state
        // This is the correct way to modify the tasks state managed by the hook.
        reorderTasks(newOrderedTasks);
      }
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-4">
      <h1 className="text-4xl font-bold text-center text-indigo-400 my-8">
        AI To-Do List
      </h1>

      <AddTaskForm onAddTask={addTask} />

      {/* DndContext provides the drag-and-drop environment */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter} // Determines how collisions are detected
        onDragEnd={handleDragEnd} // Our handler for drag end
      >
        {/* SortableContext manages the sortable items */}
        <SortableContext
          items={tasks.map(task => task.id)} // Pass IDs of sortable items
          strategy={verticalListSortingStrategy} // Strategy for vertical list sorting
        >
          <TaskList
            tasks={tasks}
            onToggleComplete={toggleTaskCompletion}
            onDelete={deleteTask}
            onEdit={editTask}
          />
        </SortableContext>
      </DndContext>

      <footer className="text-center text-zinc-500 text-sm mt-auto py-4">
        Built with Next.js, TypeScript, Tailwind CSS, and AI.
      </footer>
    </main>
  );
}