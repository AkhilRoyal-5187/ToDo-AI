// src/app/api/reorder-tasks/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { Task } from '@/lib/types'; // Make sure this path is correct for your Task interface

// Access your API key as an environment variable
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GOOGLE_GEMINI_API_KEY is not set in .env.local");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { tasks, newTaskText } = await request.json();

    if (!tasks || !Array.isArray(tasks) || typeof newTaskText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: tasks array or newTaskText missing/invalid.' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- CRUCIAL CHANGE TO PROMPT: Ask for IDs ---
    const prompt = `Given the following list of tasks (format: "Task Text [ID:ID_VALUE]"), and a new task, reorder the entire list based on implied priority, urgency, or logical grouping. Your output MUST be a JSON array of strings, where each string is the **ID** of a task from the original list OR the new task's placeholder ID if it should be included. Do NOT include task text, numbers, or any other explanations. Ensure all original task IDs and the new task's placeholder ID are present in the reordered list.

Tasks:
${tasks.map((task: Task) => `${task.text} [ID:${task.id}]`).join('\n')}

New Task: "${newTaskText}" [ID:NEW_TASK_PLACEHOLDER]

Reordered Order (JSON array of task IDs or "NEW_TASK_PLACEHOLDER"):`;

    console.log("Sending prompt to Gemini (asking for IDs):", prompt);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const llmRawText = response.text().replace(/```json\n|\n```/g, '').trim();

    console.log("Gemini raw response (expected IDs):", llmRawText);

    let reorderedIds: string[] = [];
    try {
        reorderedIds = JSON.parse(llmRawText);
        if (!Array.isArray(reorderedIds) || !reorderedIds.every(item => typeof item === 'string')) {
            throw new Error("LLM response was not a JSON array of strings (IDs).");
        }
    } catch (parseError) {
        console.error("Failed to parse LLM response as JSON array of IDs:", parseError, llmRawText);
        // Fallback if parsing fails: add new task to the end of original tasks.
        const newTaskId = crypto.randomUUID();
        const newLLMTask: Task = { id: newTaskId, text: newTaskText, completed: false, priorityScore: 0, createdAt: Date.now() };
        return NextResponse.json({ reorderedTasks: [...tasks, newLLMTask] }, { status: 200 });
    }

    const finalReorderedTasks: Task[] = [];
    // Create a map for efficient lookup of existing tasks by their ID
    const existingTaskMap = new Map(tasks.map((task: Task) => [task.id, task]));
    let isNewTaskAdded = false;

    // Reconstruct the tasks array based on the order of IDs provided by the LLM
    for (const idFromLLM of reorderedIds) {
        if (existingTaskMap.has(idFromLLM)) {
            finalReorderedTasks.push(existingTaskMap.get(idFromLLM)!);
            existingTaskMap.delete(idFromLLM); // Remove from map to track what's been added
        } else if (idFromLLM === "NEW_TASK_PLACEHOLDER" && !isNewTaskAdded) {
            // If it's the placeholder for the new task
            finalReorderedTasks.push({
                id: crypto.randomUUID(), // Assign a new unique ID to this task
                text: newTaskText, // Use original newTaskText for the actual task
                completed: false,
                priorityScore: 0,
                createdAt: Date.now()
            });
            isNewTaskAdded = true; // Mark that the new task has been added
        } else {
            console.warn(`LLM returned unrecognized ID or duplicate: "${idFromLLM}". Skipping.`);
        }
    }

    // Fallback: Add any original tasks that the LLM might have omitted from its response
    existingTaskMap.forEach(task => {
        console.warn(`Task "${task.text}" (ID: ${task.id}) was not returned by LLM's reordered list. Adding to end as a fallback.`);
        finalReorderedTasks.push(task);
    });

    // Fallback: Ensure the new task is added even if the LLM somehow missed its placeholder
    if (!isNewTaskAdded) {
        console.warn("New task was not found in LLM's reordered list. Adding it to the end as a fallback.");
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
    return NextResponse.json({ error: 'Failed to reorder tasks', details: (error as Error).message }, { status: 500 });
  }
}