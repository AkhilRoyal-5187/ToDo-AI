// src/app/api/reorder-tasks/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { Task } from '@/lib/types'; // Make sure this path is correct for your Task interface

// Access your API key as an environment variable
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GOOGLE_GEMINI_API_KEY is not set in .env.local");
  // In a production app, you might want to throw an error or handle this more gracefully.
  // For development, we'll proceed but log the error.
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || ''); // Provide a fallback empty string for safety

// This defines the POST endpoint handler for Next.js API Routes
export async function POST(request: Request) {
  try {
    // Parse the request body to get the current tasks and the new task text
    const { tasks, newTaskText } = await request.json();

    // Basic validation of the incoming data
    if (!tasks || !Array.isArray(tasks) || typeof newTaskText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: tasks array or newTaskText missing/invalid.' },
        { status: 400 }
      );
    }

    // Initialize the Generative Model
    // Using "gemini-1.5-flash" is generally good for text generation tasks.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- LLM Prompt for Reordering ---
    // The prompt now explicitly asks the LLM to return a JSON array of strings,
    // where each string is the TEXT of a task.
    // We adapted this based on the LLM's consistent behavior in previous responses.
    const prompt = `Given the following list of tasks (format: "Text [ID:ID_VALUE]"), and a new task, reorder the entire list based on implied priority, urgency, or logical grouping. Your output MUST be a JSON array of strings, where each string is the exact text of a task from the original list OR the exact text of the new task if it should be included. Do not include IDs, numbers, or any other explanations. Ensure all original task texts and the new task text are present in the reordered list.

Tasks:
${tasks.map((task: Task) => `${task.text} [ID:${task.id}]`).join('\n')}

New Task: "${newTaskText}"

Reordered Order (JSON array of strings, each string is an existing task text or the new task text):`;

    console.log("Sending prompt to Gemini:", prompt); // For debugging purposes

    const result = await model.generateContent(prompt);
    const response = await result.response;
    // Clean up common LLM code block formatting (e.g., "```json\n" and "\n```")
    const llmRawText = response.text().replace(/```json\n|\n```/g, '').trim();

    console.log("Gemini raw response:", llmRawText); // For debugging purposes

    let reorderedTextItems: string[] = [];
    try {
        reorderedTextItems = JSON.parse(llmRawText);
        // Ensure the parsed result is indeed an array
        if (!Array.isArray(reorderedTextItems)) {
            throw new Error("LLM response was not a JSON array of strings.");
        }
    } catch (parseError) {
        console.error("Failed to parse LLM response as JSON array of texts:", parseError, llmRawText);
        // Fallback: If parsing fails, just add the new task to the end of the original tasks list.
        const newTaskId = crypto.randomUUID(); // Generate a new ID for the task locally
        const newLLMTask: Task = { id: newTaskId, text: newTaskText, completed: false, priorityScore: 0, createdAt: Date.now() };
        return NextResponse.json({ reorderedTasks: [...tasks, newLLMTask] }, { status: 200 });
    }

    const finalReorderedTasks: Task[] = [];
    // Create a Map for efficient lookup of existing tasks by their TEXT (lowercase for robust matching)
    // We're now mapping text to the original Task object
    const existingTaskMap = new Map(tasks.map((task: Task) => [task.text.toLowerCase(), task]));
    let isNewTaskAdded = false;

    // Reconstruct the tasks array based on the order of texts provided by the LLM
    for (const itemTextFromLLM of reorderedTextItems) {
        // Normalize the text from LLM for case-insensitive matching
        const normalizedItemText = itemTextFromLLM.trim().toLowerCase();

        // Check if it's an existing task's text
        if (existingTaskMap.has(normalizedItemText)) {
            finalReorderedTasks.push(existingTaskMap.get(normalizedItemText)!);
            existingTaskMap.delete(normalizedItemText); // Remove from map to track what's been added
        } else if (normalizedItemText === newTaskText.trim().toLowerCase() && !isNewTaskAdded) {
            // If it's the exact text of the new task and it hasn't been added yet
            finalReorderedTasks.push({
                id: crypto.randomUUID(), // Assign a new unique ID to this task
                text: newTaskText, // Use original newTaskText for the actual task
                completed: false,
                priorityScore: 0,
                createdAt: Date.now()
            });
            isNewTaskAdded = true; // Mark that the new task has been added
        } else {
            // This case means the LLM returned something unexpected (e.g., text not matching any existing task or the new task)
            console.warn(`LLM returned unrecognized item: "${itemTextFromLLM}". Skipping.`);
        }
    }

    // Fallback: Add any original tasks that the LLM might have omitted from its response
    // (This ensures no data loss, though LLM should ideally return all tasks)
    existingTaskMap.forEach(task => {
        console.warn(`Task "${task.text}" (ID: ${task.id}) was not returned by LLM's reordered list. Adding to end as a fallback.`);
        finalReorderedTasks.push(task);
    });

    // Fallback: Ensure the new task is added even if the LLM somehow missed it or rephrased it slightly
    if (!isNewTaskAdded) {
        console.warn("New task was not found in LLM's reordered list by exact text match. Adding it to the end as a fallback.");
        finalReorderedTasks.push({
            id: crypto.randomUUID(),
            text: newTaskText,
            completed: false,
            priorityScore: 0,
            createdAt: Date.now()
        });
    }

    return NextResponse.json({ reorderedTasks: finalReorderedTasks }, { status: 200 });

  } catch (error) {
    console.error('Error in reorder-tasks API:', error);
    // Return a 500 status with details if an error occurs during processing
    return NextResponse.json({ error: 'Failed to reorder tasks', details: (error as Error).message }, { status: 500 });
  }
}