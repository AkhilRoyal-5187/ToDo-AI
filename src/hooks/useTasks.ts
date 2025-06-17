// src/hooks/useTasks.ts

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { loadTasks, saveTasks } from '@/lib/localStorage';
// import { suggestInsertionPoint } from '@/lib/ai'; // We'll no longer use this for AI placement

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Load tasks from localStorage on initial render
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Save tasks to localStorage whenever the tasks state changes
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Function to add a new task with LLM-suggested reordering
  const addTask = async (text: string) => { // Make addTask an async function
    // For LLM reordering, we don't need a temporary ID until we get the full reordered list.
    // We send the text of the new task and the existing tasks to the LLM.

    try {
      const response = await fetch('/api/reorder-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks, newTaskText: text }), // Send current tasks and the new task text
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("LLM reorder response data:", data);

      if (data.reorderedTasks) {
        setTasks(data.reorderedTasks); // Update tasks with the LLM-reordered list
      } else {
        console.error("LLM reorder response did not contain 'reorderedTasks'. Falling back to simple add.");
        // Fallback if LLM reordering fails
        const newTask: Task = {
            id: crypto.randomUUID(),
            text,
            completed: false,
            priorityScore: 0,
            createdAt: Date.now(),
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
      }
    } catch (error) {
      console.error('Error reordering tasks with LLM:', error);
      // Fallback: If API call fails, just add new task to the end of the current list
      const newTask: Task = {
          id: crypto.randomUUID(),
          text,
          completed: false,
          priorityScore: 0,
          createdAt: Date.now(),
      };
      setTasks(prevTasks => [...prevTasks, newTask]);
    }
  };

  // Function to toggle task completion status
  const toggleTaskCompletion = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Function to delete a task
  const deleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };

  // Function to edit a task's text
  const editTask = (id: string, newText: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, text: newText } : task
      )
    );
    // TODO: Consider if editing should trigger LLM re-evaluation
  };

  // Function to reorder tasks manually (for drag-and-drop)
  const reorderTasks = (newOrder: Task[]) => {
    setTasks(newOrder);
  };

  return {
    tasks,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    editTask,
    reorderTasks,
  };
};