
import { Task } from './types';

const LOCAL_STORAGE_KEY = 'ai-todo-tasks';


export const loadTasks = (): Task[] => {
  if (typeof window === 'undefined') {
    return []; 
  }
  try {
    const serializedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    return serializedTasks ? JSON.parse(serializedTasks) : [];
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    return [];
  }
};

/**
 * Saves tasks to localStorage.
 * @param tasks The array of Task objects to save.
 */
export const saveTasks = (tasks: Task[]): void => {
  if (typeof window === 'undefined') {
    return; // Avoid localStorage access on server side during build
  }
  try {
    const serializedTasks = JSON.stringify(tasks);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedTasks);
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
};