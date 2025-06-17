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

    // --- LLM Prompt for Reordering ---
    // Emphasize the output format very strictly: only array of text strings.
    const prompt = `Given the following list of tasks (format: "Task Text [ID:ID_VALUE]"), and a new task, reorder the entire list based on implied priority, urgency, or logical grouping. Your output MUST be a JSON array of strings, where each string is the exact "Task Text" from an original task OR the exact text of the new task if it should be included. Do NOT include "[ID:ID_VALUE]" or any other text, numbers, or explanations in the output array. Ensure all original task texts and the new task text are present in the reordered list.

Tasks:
${tasks.map((task: Task) => `${task.text} [ID:${task.id}]`).join('\n')}

New Task: "${newTaskText}"

Reordered Order (JSON array of strings, each string is an existing task text or the new task text):`;

    console.log("Sending prompt to Gemini:", prompt);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const llmRawText = response.text().replace(/```json\n|\n```/g, '').trim();

    console.log("Gemini raw response:", llmRawText);

    let reorderedTextItems: string[] = [];
    try {
        reorderedTextItems = JSON.parse(llmRawText);
        if (!Array.isArray(reorderedTextItems)) {
            throw new Error("LLM response was not a JSON array of strings.");
        }
    } catch (parseError) {
        console.error("Failed to parse LLM response as JSON array of texts:", parseError, llmRawText);
        // Fallback if parsing fails: add new task to the end of original tasks.
        const newTaskId = crypto.randomUUID();
        const newLLMTask: Task = { id: newTaskId, text: newTaskText, completed: false, priorityScore: 0, createdAt: Date.now() };
        return NextResponse.json({ reorderedTasks: [...tasks, newLLMTask] }, { status: 200 });
    }

    const finalReorderedTasks: Task[] = [];
    // Create a map for efficient lookup of existing tasks by their TEXT (lowercase for robust matching)
    // Also store the original Task object
    const existingTaskMap = new Map(tasks.map((task: Task) => [task.text.toLowerCase(), task]));
    let isNewTaskAdded = false;

    // Normalize the new task text for comparison
    const normalizedNewTaskText = newTaskText.trim().toLowerCase();

    // Reconstruct the tasks array based on the order of texts provided by the LLM
    for (const itemTextFromLLM of reorderedTextItems) {
        // --- START OF MODIFIED LOGIC ---
        let processedItemText = itemTextFromLLM.trim();

        // Attempt to strip the "[ID:UUID]" part if LLM mistakenly includes it
        // This regex ensures we only remove valid UUID patterns
        const idPattern = /\s*\[ID:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\]/i;
        if (idPattern.test(processedItemText)) {
            processedItemText = processedItemText.replace(idPattern, '').trim();
        }
        // --- END OF MODIFIED LOGIC ---

        const normalizedProcessedItemText = processedItemText.toLowerCase();

        // Check if it's an existing task's text
        if (existingTaskMap.has(normalizedProcessedItemText)) {
            finalReorderedTasks.push(existingTaskMap.get(normalizedProcessedItemText)!);
            existingTaskMap.delete(normalizedProcessedItemText); // Remove from map to track what's been added
        } else if (normalizedProcessedItemText === normalizedNewTaskText && !isNewTaskAdded) {
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
            console.warn(`LLM returned unrecognized or rephrased item: "${itemTextFromLLM}". Attempted to process as "${processedItemText}". Skipping.`);
        }
    }

    // Fallback: Add any original tasks that the LLM might have omitted from its response
    existingTaskMap.forEach(task => {
        console.warn(`Task "${task.text}" (ID: ${task.id}) was not returned by LLM's reordered list (or was rephrased unrecognized). Adding to end as a fallback.`);
        finalReorderedTasks.push(task);
    });

    // Fallback: Ensure the new task is added even if the LLM somehow missed it or rephrased it slightly
    if (!isNewTaskAdded) {
        console.warn("New task was not found in LLM's reordered list by exact text match (or was rephrased unrecognized). Adding it to the end as a fallback.");
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