'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TaskNode from '@/components/TaskNode';
import TaskEditForm from '@/components/TaskEditForm';
import TaskViewModal from '@/components/TaskViewModal';
import FilterSidebar from '@/components/FilterSidebar';
import { Task, TaskLink, Workflow, TaskStatus } from '@/lib/types';

const nodeTypes: NodeTypes = {
  task: TaskNode,
};

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Load tasks and links from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksResponse, linksResponse, workflowsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/links'),
        fetch('/api/workflows'),
      ]);

      if (!tasksResponse.ok) {
        const errorData = await tasksResponse.json();
        throw new Error(errorData.error || 'Failed to load tasks');
      }
      if (!linksResponse.ok) {
        const errorData = await linksResponse.json();
        throw new Error(errorData.error || 'Failed to load links');
      }

      const tasksData = await tasksResponse.json();
      const linksData = await linksResponse.json();
      const workflowsData = workflowsResponse.ok ? await workflowsResponse.json() : [];

      setTasks(tasksData);
      setLinks(linksData);
      setWorkflows(workflowsData);

      // Convert tasks to nodes - use saved positions or default grid layout
      const taskNodes: Node[] = tasksData.map((task: Task, index: number) => ({
        id: task.id,
        type: 'task',
        position: {
          x: task.x !== undefined ? task.x : (index % 5) * 250 + 50,
          y: task.y !== undefined ? task.y : Math.floor(index / 5) * 200 + 50,
        },
        data: {
          ...task,
          onEdit: handleEditTask,
          onDelete: handleDeleteTask,
          onView: handleViewTask,
          workflowLabel: workflowsData.find((w: Workflow) => w.id === task.workflow_id)?.label || '',
          isFiltered: false, // Will be updated based on filters
        },
      }));

      // Convert links to edges
      const linkEdges: Edge[] = linksData.map((link: TaskLink) => ({
        id: link.id,
        source: link.source,
        target: link.target,
        type: 'smoothstep',
        animated: false,
        markerEnd: 'arrowclosed' as const,
      }));

      setNodes(taskNodes);
      setEdges(linkEdges);
    } catch (error) {
      console.error('Failed to load data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tasks';
      alert(`Failed to load tasks: ${errorMessage}\n\nMake sure:\n1. Your Apps Script URL is set in .env.local\n2. You have restarted the dev server after adding the URL\n3. The Apps Script is deployed and accessible`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle edge connection (creating links)
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;

      // Check if link already exists
      const existingLink = links.find(
        (link) => link.source === params.source && link.target === params.target
      );

      if (existingLink) {
        alert('Link already exists');
        return;
      }

      try {
        const response = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: params.source,
            target: params.target,
          }),
        });

        if (response.ok) {
          const newLink = await response.json();
          setLinks([...links, newLink]);
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                id: newLink.id,
                type: 'smoothstep',
                animated: false,
                markerEnd: 'arrowclosed' as const,
              },
              eds
            )
          );
        } else {
          alert('Failed to create link');
        }
      } catch (error) {
        console.error('Failed to create link:', error);
        alert('Failed to create link');
      }
    },
    [links, setEdges]
  );

  // Handle task view
  const handleViewTask = useCallback((task: Task) => {
    setViewingTask(task);
  }, []);

  // Handle task edit
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []);

  // Handle task delete
  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!confirm('Are you sure you want to delete this task? This will also delete all its connections.')) {
        return;
      }

      try {
        const response = await fetch(`/api/tasks?id=${taskId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove task from state
          setTasks(tasks.filter((t) => t.id !== taskId));
          setNodes(nodes.filter((n) => n.id !== taskId));
          // Remove all edges connected to this task
          setEdges(edges.filter((e) => e.source !== taskId && e.target !== taskId));
          setLinks(links.filter((l) => l.source !== taskId && l.target !== taskId));
        } else {
          alert('Failed to delete task');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task');
      }
    },
    [tasks, nodes, edges, links, setNodes, setEdges]
  );

  // Handle task save (create or update)
  const handleSaveTask = useCallback(
    async (task: Partial<Task>, setLoading?: (loading: boolean) => void) => {
      try {
        if (setLoading) setLoading(true);
        const isNew = !task.id;
        const url = '/api/tasks';
        const method = isNew ? 'POST' : 'PUT';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });

        if (response.ok) {
          const savedTask = await response.json();

          if (isNew) {
            // Add new task
            setTasks([...tasks, savedTask]);
            const newNode: Node = {
              id: savedTask.id,
              type: 'task',
              position: {
                x: savedTask.x !== undefined ? savedTask.x : Math.random() * 500 + 100,
                y: savedTask.y !== undefined ? savedTask.y : Math.random() * 500 + 100,
              },
              data: {
                ...savedTask,
                onEdit: handleEditTask,
                onDelete: handleDeleteTask,
                onView: handleViewTask,
                workflowLabel: workflows.find((w: Workflow) => w.id === savedTask.workflow_id)?.label || '',
                isFiltered: false,
              },
            };
            setNodes([...nodes, newNode]);
          } else {
            // Update existing task
            setTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
            setNodes(
              nodes.map((n) =>
                n.id === savedTask.id
                  ? {
                      ...n,
                      data: {
                        ...savedTask,
                        onEdit: handleEditTask,
                        onDelete: handleDeleteTask,
                        onView: handleViewTask,
                        workflowLabel: workflows.find((w: Workflow) => w.id === savedTask.workflow_id)?.label || '',
                        isFiltered: false,
                      },
                    }
                  : n
              )
            );
          }

          setIsFormOpen(false);
          setEditingTask(null);
        } else {
          alert('Failed to save task');
        }
      } catch (error) {
        console.error('Failed to save task:', error);
        alert('Failed to save task');
      } finally {
        if (setLoading) setLoading(false);
      }
    },
    [tasks, nodes, setNodes, handleEditTask, handleDeleteTask]
  );

  // Handle create new task
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setIsFormOpen(true);
  }, []);

  // Reload workflows
  const reloadWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to reload workflows:', error);
    }
  }, []);

  // Update nodes based on filters
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const task = tasks.find((t) => t.id === node.id);
        if (!task) return node;

        const matchesWorkflow = !selectedWorkflowId || task.workflow_id === selectedWorkflowId;
        const matchesStatus = !selectedStatus || task.status === selectedStatus;
        const isFiltered = !matchesWorkflow || !matchesStatus;

        return {
          ...node,
          data: {
            ...node.data,
            workflowLabel: workflows.find((w: Workflow) => w.id === task.workflow_id)?.label || '',
            isFiltered,
          },
          style: isFiltered
            ? {
                opacity: 0.3,
                filter: 'grayscale(100%)',
              }
            : undefined,
        };
      })
    );
  }, [selectedWorkflowId, selectedStatus, tasks, workflows, setNodes]);

  // Handle node position change (when dragged)
  const onNodeDragStop = useCallback(
    async (_event: any, node: Node) => {
      // Find the task and update its position
      const task = tasks.find((t) => t.id === node.id);
      if (task) {
        try {
          const updatedTask = {
            ...task,
            x: node.position.x,
            y: node.position.y,
          };
          
          // Update in state immediately for responsive UI
          setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          setNodes(
            nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    position: node.position,
                    data: {
                      ...n.data,
                      x: node.position.x,
                      y: node.position.y,
                    },
                  }
                : n
            )
          );

          // Save to API
          await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTask),
          });
        } catch (error) {
          console.error('Failed to save position:', error);
          // Revert on error
          loadData();
        }
      }
    },
    [tasks, nodes, setNodes, loadData]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={handleCreateTask}
          className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 transition-colors"
        >
          + New Task
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {isFormOpen && (
        <TaskEditForm
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
          onWorkflowCreated={reloadWorkflows}
        />
      )}

      {viewingTask && (
        <TaskViewModal
          task={viewingTask}
          workflows={workflows}
          onEdit={handleEditTask}
          onClose={() => setViewingTask(null)}
        />
      )}

      <FilterSidebar
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        selectedStatus={selectedStatus}
        onWorkflowChange={setSelectedWorkflowId}
        onStatusChange={setSelectedStatus}
        isOpen={isFilterSidebarOpen}
        onToggle={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
      />
    </div>
  );
}
