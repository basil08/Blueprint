import { Task, TaskLink, Workflow, Graph } from './types';

// Replace this with your Google Apps Script Web App URL
// After deploying the Apps Script, you'll get a URL like:
// https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

// Only log warning on server-side (during build/API routes)
if (typeof window === 'undefined' && !APPS_SCRIPT_URL) {
  console.warn('NEXT_PUBLIC_APPS_SCRIPT_URL is not set. Please set it in your .env.local file and restart the dev server.');
}

async function fetchAppsScript(params: Record<string, string>, method: string = 'GET', body?: any) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL is not configured. Please set it in your .env.local file and restart the dev server.');
  }

  const url = new URL(APPS_SCRIPT_URL);
  
  // Add method to params for Apps Script
  params.method = method;
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const options: RequestInit = {
    method: 'POST', // Apps Script web apps only accept POST
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Include body in postData for Apps Script
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

// Graph API
export async function getAllGraphs(): Promise<Graph[]> {
  return fetchAppsScript({ type: 'graphs' });
}

export async function getGraph(id: string): Promise<Graph> {
  return fetchAppsScript({ type: 'graph', id });
}

export async function createGraph(graph: Omit<Graph, 'id' | 'createdAt' | 'updatedAt'>): Promise<Graph> {
  return fetchAppsScript({ type: 'graph' }, 'POST', graph);
}

export async function updateGraph(graph: Partial<Graph> & { id: string }): Promise<Graph> {
  return fetchAppsScript({ type: 'graph' }, 'PUT', graph);
}

export async function deleteGraph(id: string): Promise<void> {
  await fetchAppsScript({ type: 'graph', id }, 'DELETE');
}

// Task API
export async function getAllTasks(graphId?: string): Promise<Task[]> {
  const params: Record<string, string> = { type: 'tasks' };
  if (graphId) {
    params.graph_id = graphId;
  }
  return fetchAppsScript(params);
}

export async function getTask(id: string): Promise<Task> {
  return fetchAppsScript({ type: 'task', id });
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  return fetchAppsScript({ type: 'task' }, 'POST', task);
}

export async function updateTask(task: Partial<Task> & { id: string }): Promise<Task> {
  return fetchAppsScript({ type: 'task' }, 'PUT', task);
}

export async function deleteTask(id: string): Promise<void> {
  await fetchAppsScript({ type: 'task', id }, 'DELETE');
}

// Link API
export async function getAllLinks(graphId?: string): Promise<TaskLink[]> {
  const params: Record<string, string> = { type: 'links' };
  if (graphId) {
    params.graph_id = graphId;
  }
  return fetchAppsScript(params);
}

export async function createLink(link: Omit<TaskLink, 'id'>): Promise<TaskLink> {
  return fetchAppsScript({ type: 'link' }, 'POST', link);
}

export async function deleteLink(id: string): Promise<void> {
  await fetchAppsScript({ type: 'link', id }, 'DELETE');
}

// Workflow API
export async function getAllWorkflows(graphId?: string): Promise<Workflow[]> {
  const params: Record<string, string> = { type: 'workflows' };
  if (graphId) {
    params.graph_id = graphId;
  }
  return fetchAppsScript(params);
}

export async function createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
  return fetchAppsScript({ type: 'workflow' }, 'POST', workflow);
}

