import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, TaskLink, Workflow, Graph } from './types';

// Helper function to convert Firestore timestamp to ISO string
const timestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
};

// Helper function to convert document data with proper timestamp handling
const convertDoc = (docData: any, id: string) => {
  const data = docData.data();
  const converted: any = { id, ...data };
  
  // Convert all timestamp fields
  if (data.createdAt) {
    converted.createdAt = timestampToISO(data.createdAt);
  }
  if (data.updatedAt) {
    converted.updatedAt = timestampToISO(data.updatedAt);
  }
  
  return converted;
};

// Graph API
export async function getAllGraphs(): Promise<Graph[]> {
  const graphsRef = collection(db, 'graphs');
  const snapshot = await getDocs(graphsRef);
  return snapshot.docs.map(doc => convertDoc(doc, doc.id) as Graph);
}

export async function getGraph(id: string): Promise<Graph> {
  const graphRef = doc(db, 'graphs', id);
  const graphSnap = await getDoc(graphRef);
  
  if (!graphSnap.exists()) {
    throw new Error(`Graph with id ${id} not found`);
  }
  
  return convertDoc(graphSnap, id) as Graph;
}

export async function createGraph(graph: Omit<Graph, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Graph> {
  const now = new Date().toISOString();
  
  const graphData = {
    ...graph,
    createdAt: now,
    updatedAt: now,
  };
  
  if (customId) {
    // Create with specific ID
    const graphRef = doc(db, 'graphs', customId);
    await setDoc(graphRef, graphData);
    return {
      id: customId,
      ...graphData,
    } as Graph;
  } else {
    // Auto-generate ID
    const graphsRef = collection(db, 'graphs');
    const docRef = await addDoc(graphsRef, graphData);
    return {
      id: docRef.id,
      ...graphData,
    } as Graph;
  }
}

export async function updateGraph(graph: Partial<Graph> & { id: string }): Promise<Graph> {
  const { id, ...updateData } = graph;
  const graphRef = doc(db, 'graphs', id);
  
  const updatePayload: any = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  await updateDoc(graphRef, updatePayload);
  
  const updatedSnap = await getDoc(graphRef);
  return convertDoc(updatedSnap, id) as Graph;
}

export async function deleteGraph(id: string): Promise<void> {
  const graphRef = doc(db, 'graphs', id);
  await deleteDoc(graphRef);
}

// Task API
export async function getAllTasks(graphId?: string): Promise<Task[]> {
  const tasksRef = collection(db, 'tasks');
  let q = query(tasksRef);
  
  if (graphId) {
    q = query(tasksRef, where('graph_id', '==', graphId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = convertDoc(doc, doc.id);
    // Convert timestamp fields specific to tasks
    if (data.createdAt) {
      data.createdAt = timestampToISO(data.createdAt);
    }
    if (data.updatedAt) {
      data.updatedAt = timestampToISO(data.updatedAt);
    }
    return data as Task;
  });
}

export async function getTask(id: string): Promise<Task> {
  const taskRef = doc(db, 'tasks', id);
  const taskSnap = await getDoc(taskRef);
  
  if (!taskSnap.exists()) {
    throw new Error(`Task with id ${id} not found`);
  }
  
  const data = convertDoc(taskSnap, id);
  if (data.createdAt) {
    data.createdAt = timestampToISO(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = timestampToISO(data.updatedAt);
  }
  return data as Task;
}

export async function createTask(task: Partial<Task>, customId?: string): Promise<Task> {
  const now = new Date().toISOString();
  
  const taskData: any = {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'Pending',
    backgroundColor: task.backgroundColor || '#ffffff',
    foregroundColor: task.foregroundColor || '#000000',
    createdBy: task.createdBy || '',
    createdAt: now,
    updatedAt: now,
    graph_id: task.graph_id || '',
  };
  
  // Optional fields
  if (task.updatedBy) taskData.updatedBy = task.updatedBy;
  if (task.assignedTo) taskData.assignedTo = task.assignedTo;
  if (task.assignedBy) taskData.assignedBy = task.assignedBy;
  if (task.workflow_id) taskData.workflow_id = task.workflow_id;
  if (task.x !== undefined) taskData.x = task.x;
  if (task.y !== undefined) taskData.y = task.y;
  
  if (customId) {
    // Create with specific ID
    const taskRef = doc(db, 'tasks', customId);
    await setDoc(taskRef, taskData);
    return {
      id: customId,
      ...taskData,
    } as Task;
  } else {
    // Auto-generate ID
    const tasksRef = collection(db, 'tasks');
    const docRef = await addDoc(tasksRef, taskData);
    return {
      id: docRef.id,
      ...taskData,
    } as Task;
  }
}

export async function updateTask(task: Partial<Task> & { id: string }): Promise<Task> {
  const { id, ...updateData } = task;
  const taskRef = doc(db, 'tasks', id);
  
  const updatePayload: any = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  await updateDoc(taskRef, updatePayload);
  
  const updatedSnap = await getDoc(taskRef);
  const data = convertDoc(updatedSnap, id);
  if (data.createdAt) {
    data.createdAt = timestampToISO(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = timestampToISO(data.updatedAt);
  }
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const taskRef = doc(db, 'tasks', id);
  await deleteDoc(taskRef);
}

// Link API
export async function getAllLinks(graphId?: string): Promise<TaskLink[]> {
  const linksRef = collection(db, 'links');
  let q = query(linksRef);
  
  if (graphId) {
    q = query(linksRef, where('graph_id', '==', graphId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertDoc(doc, doc.id) as TaskLink);
}

export async function createLink(link: Omit<TaskLink, 'id'>, customId?: string): Promise<TaskLink> {
  const linkData = {
    source: link.source,
    target: link.target,
    graph_id: link.graph_id,
  };
  
  if (customId) {
    // Create with specific ID
    const linkRef = doc(db, 'links', customId);
    await setDoc(linkRef, linkData);
    return {
      id: customId,
      ...linkData,
    } as TaskLink;
  } else {
    // Auto-generate ID
    const linksRef = collection(db, 'links');
    const docRef = await addDoc(linksRef, linkData);
    return {
      id: docRef.id,
      ...linkData,
    } as TaskLink;
  }
}

export async function deleteLink(id: string): Promise<void> {
  const linkRef = doc(db, 'links', id);
  await deleteDoc(linkRef);
}

// Workflow API
export async function getAllWorkflows(graphId?: string): Promise<Workflow[]> {
  const workflowsRef = collection(db, 'workflows');
  let q = query(workflowsRef);
  
  if (graphId) {
    q = query(workflowsRef, where('graph_id', '==', graphId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertDoc(doc, doc.id) as Workflow);
}

export async function createWorkflow(workflow: Omit<Workflow, 'id'>, customId?: string): Promise<Workflow> {
  const workflowData = {
    label: workflow.label,
    graph_id: workflow.graph_id,
  };
  
  if (customId) {
    // Create with specific ID
    const workflowRef = doc(db, 'workflows', customId);
    await setDoc(workflowRef, workflowData);
    return {
      id: customId,
      ...workflowData,
    } as Workflow;
  } else {
    // Auto-generate ID
    const workflowsRef = collection(db, 'workflows');
    const docRef = await addDoc(workflowsRef, workflowData);
    return {
      id: docRef.id,
      ...workflowData,
    } as Workflow;
  }
}
