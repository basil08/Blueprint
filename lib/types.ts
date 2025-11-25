export type TaskStatus = "Pending" | "In Process" | "Completed";

export interface Graph {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  label: string;
  graph_id: string; // Graph ID reference
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  backgroundColor: string;
  foregroundColor: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  assignedTo?: string;
  assignedBy?: string;
  workflow_id?: string; // Workflow ID reference
  graph_id: string; // Graph ID reference
  x?: number; // X coordinate position
  y?: number; // Y coordinate position
}

export interface TaskLink {
  id: string;
  source: string; // Task ID
  target: string; // Task ID
  graph_id: string; // Graph ID reference
}

