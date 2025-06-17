// src/lib/ai.ts

import { Task } from './types';

// Helper function to determine priority based on task text
const getPriorityFromText = (text: string): number => {
  const lowerText = text.toLowerCase();

  // High Priority Keywords (Score: 3)
  const highPriorityKeywords = ['urgent', 'important', 'asap', 'deadline', 'critical', 'must', 'immediate', 'now'];
  if (highPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
    return 3;
  }

  // Medium Priority Keywords (Score: 2)
  const mediumPriorityKeywords = ['meeting', 'call', 'appointment', 'schedule', 'tomorrow', 'follow up', 'email'];
  if (mediumPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
    return 2;
  }

  // Low Priority Keywords (Score: 1)
  const lowPriorityKeywords = ['optional', 'later', 'research', 'read', 'plan', 'think about', 'consider'];
  if (lowPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
    return 1;
  }

  // Default Priority (Score: 0)
  return 0;
};

/**
 * AI-driven function to suggest the optimal insertion point for a new task.
 * It uses a rule-based system to determine priority and finds the best place
 * in the existing list, aiming to keep higher priority tasks earlier.
 * @param newTask The task to be inserted (its text will be analyzed for priority).
 * @param existingTasks The current list of tasks.
 * @returns The suggested index (0-based) for inserting the new task.
 */
export const suggestInsertionPoint = (newTask: Task, existingTasks: Task[]): number => {
  if (existingTasks.length === 0) {
    return 0; // If list is empty, always insert at the beginning
  }

  const newTaskPriority = getPriorityFromText(newTask.text);

  // Find the first task in the existing list that has a lower priority
  // or is a task that has already been completed (completed tasks usually go to bottom)
  for (let i = 0; i < existingTasks.length; i++) {
    const currentTask = existingTasks[i];
    const currentTaskPriority = getPriorityFromText(currentTask.text);

    // If the new task has higher priority, insert it before the current task
    if (newTaskPriority > currentTaskPriority) {
      return i;
    }
    // If priorities are equal, we might want to consider creation time or just append
    // For now, if equal, we'll try to find a task with lower priority after this one.
    // If we iterate through and find no task with lower priority, it will be placed at the end.
  }

  // If the new task's priority is not higher than any existing task (or equal to all),
  // insert it at the end.
  return existingTasks.length;
};