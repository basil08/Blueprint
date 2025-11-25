'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
  EdgeTypes,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TaskNode from '@/components/TaskNode';
import CustomEdge from '@/components/CustomEdge';
import TaskEditForm from '@/components/TaskEditForm';
import TaskViewModal from '@/components/TaskViewModal';
import FilterSidebar from '@/components/FilterSidebar';
import { Task, TaskLink, Workflow, TaskStatus, Graph } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation';

const nodeTypes: NodeTypes = {
  task: TaskNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

function CanvasPageContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const graphId = searchParams.get('graph_id');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentGraph, setCurrentGraph] = useState<Graph | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string | null>(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);

  // Redirect to login if not authenticated, or to dashboard if no graph_id
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !graphId) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router, graphId]);

  // Get auth token for API calls
  const getAuthToken = useCallback(async () => {
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }, [user]);

  // Handle link delete
  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      if (!confirm('Are you sure you want to delete this link?')) {
        return;
      }

      try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/links?id=${linkId}`, {
          method: 'DELETE',
          headers,
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.ok) {
          // Remove link from state
          setLinks((prevLinks) => prevLinks.filter((l) => l.id !== linkId));
          setEdges((prevEdges) => prevEdges.filter((e) => e.id !== linkId));
        } else {
          alert('Failed to delete link');
        }
      } catch (error) {
        console.error('Failed to delete link:', error);
        alert('Failed to delete link');
      }
    },
    [setLinks, setEdges, user, router]
  );

  // Load tasks and links from API
  const loadData = useCallback(async () => {
    if (!user || !graphId) return;
    
    try {
      setLoading(true);
      const token = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [tasksResponse, linksResponse, workflowsResponse] = await Promise.all([
        fetch(`/api/tasks?graph_id=${graphId}`, { headers }),
        fetch(`/api/links?graph_id=${graphId}`, { headers }),
        fetch(`/api/workflows?graph_id=${graphId}`, { headers }),
      ]);

      // Fetch graph separately
      const graphResponse = await fetch(`/api/graphs`, { headers });
      const allGraphs = graphResponse.ok ? await graphResponse.json() : [];
      const graphData = allGraphs.find((g: Graph) => g.id === graphId) || null;

      if (tasksResponse.status === 401 || linksResponse.status === 401 || workflowsResponse.status === 401) {
        router.push('/login');
        return;
      }

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

      setCurrentGraph(graphData);

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
        type: 'custom',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 28,
          height: 28,
          color: '#000000',
        },
        data: {
          onDelete: handleDeleteLink,
        },
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
  }, [user, router, graphId, handleDeleteLink, getAuthToken]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

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
        const token = await getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (!graphId) {
          alert('Graph ID is missing');
          return;
        }

        const response = await fetch('/api/links', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            source: params.source,
            target: params.target,
            graph_id: graphId,
          }),
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.ok) {
          const newLink = await response.json();
          setLinks([...links, newLink]);
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                id: newLink.id,
                type: 'custom',
                animated: false,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 28,
                  height: 28,
                  color: '#000000',
                },
                data: {
                  onDelete: handleDeleteLink,
                },
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
    [links, setEdges, user, router, graphId, handleDeleteLink]
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
        const token = await getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/tasks?id=${taskId}`, {
          method: 'DELETE',
          headers,
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

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
    [tasks, nodes, edges, links, setNodes, setEdges, user, router]
  );

  // Handle task save (create or update)
  const handleSaveTask = useCallback(
    async (task: Partial<Task>, setLoading?: (loading: boolean) => void) => {
      try {
        if (setLoading) setLoading(true);
        const isNew = !task.id;
        const url = '/api/tasks';
        const method = isNew ? 'POST' : 'PUT';

        const token = await getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (!graphId) {
          alert('Graph ID is missing');
          return;
        }

        const taskWithGraphId = {
          ...task,
          graph_id: graphId,
        };

        const response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(taskWithGraphId),
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

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
    [tasks, nodes, setNodes, handleEditTask, handleDeleteTask, workflows, user, router, graphId]
  );

  // Handle create new task
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setIsFormOpen(true);
  }, []);

  // Reload workflows
  const reloadWorkflows = useCallback(async () => {
    if (!graphId) return;
    try {
      const token = await getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/workflows?graph_id=${graphId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to reload workflows:', error);
    }
  }, [user, graphId, getAuthToken]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Update nodes based on filters
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const task = tasks.find((t) => t.id === node.id);
        if (!task) return node;

        const matchesWorkflow = !selectedWorkflowId || task.workflow_id === selectedWorkflowId;
        const matchesStatus = !selectedStatus || task.status === selectedStatus;
        const matchesAssignedTo = !selectedAssignedTo || (task.assignedTo || '') === selectedAssignedTo;
        const isFiltered = !matchesWorkflow || !matchesStatus || !matchesAssignedTo;

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
  }, [selectedWorkflowId, selectedStatus, selectedAssignedTo, tasks, workflows, setNodes]);

  // Detect cycles in the graph using DFS
  const detectCycle = useCallback((edges: Edge[]): string[] | null => {
    // Build adjacency list: source -> [targets]
    const graph = new Map<string, string[]>();
    const allNodeIds = new Set<string>();
    
    edges.forEach((edge) => {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
      allNodeIds.add(edge.source);
      allNodeIds.add(edge.target);
    });

    // Add isolated nodes
    nodes.forEach((node) => {
      if (!graph.has(node.id)) {
        graph.set(node.id, []);
      }
      allNodeIds.add(node.id);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cyclePath: string[] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        cyclePath.push(...path.slice(cycleStart), nodeId);
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const children = graph.get(nodeId) || [];
      for (const child of children) {
        if (dfs(child, [...path])) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const nodeId of allNodeIds) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId, [])) {
          return cyclePath;
        }
      }
    }

    return null;
  }, [nodes]);

  // Auto-arrange nodes in a tree structure
  const handleAutoArrange = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsArranging(true);

    // Use setTimeout to allow UI to update and show loader
    setTimeout(async () => {
      try {
        // Detect cycles
        const cycle = detectCycle(edges);
        if (cycle) {
          alert(`Cycle detected in the dependency graph!\n\nCycle path: ${cycle.join(' -> ')}\n\nPlease remove the cycle before arranging.`);
          setIsArranging(false);
          return;
        }

        // Build graph: track children (nodes that depend on this node)
        // source -> target means target depends on source
        // So source is a parent of target
        const childrenMap = new Map<string, string[]>();
        const incomingCount = new Map<string, number>();
        const allNodeIds = new Set<string>();

        // Initialize all nodes
        nodes.forEach((node) => {
          allNodeIds.add(node.id);
          childrenMap.set(node.id, []);
          incomingCount.set(node.id, 0);
        });

        // Build graph from edges
        edges.forEach((edge) => {
          // source -> target: target depends on source, so source is parent
          const children = childrenMap.get(edge.source) || [];
          children.push(edge.target);
          childrenMap.set(edge.source, children);
          
          const count = incomingCount.get(edge.target) || 0;
          incomingCount.set(edge.target, count + 1);
        });

        // Find roots: nodes with no incoming edges
        const roots: string[] = [];
        allNodeIds.forEach((nodeId) => {
          if ((incomingCount.get(nodeId) || 0) === 0) {
            roots.push(nodeId);
          }
        });

        // If no roots found (all nodes have dependencies), use all nodes as roots
        if (roots.length === 0) {
          roots.push(...Array.from(allNodeIds));
        }

        // Assign levels using BFS
        const levelMap = new Map<string, number>();
        const queue: { nodeId: string; level: number }[] = [];

        roots.forEach((root) => {
          levelMap.set(root, 0);
          queue.push({ nodeId: root, level: 0 });
        });

        while (queue.length > 0) {
          const { nodeId, level } = queue.shift()!;
          const children = childrenMap.get(nodeId) || [];

          children.forEach((child) => {
            const currentLevel = levelMap.get(child);
            if (currentLevel === undefined || currentLevel < level + 1) {
              levelMap.set(child, level + 1);
              queue.push({ nodeId: child, level: level + 1 });
            }
          });
        }

        // Group nodes by level
        const nodesByLevel = new Map<number, string[]>();
        allNodeIds.forEach((nodeId) => {
          const level = levelMap.get(nodeId) || 0;
          if (!nodesByLevel.has(level)) {
            nodesByLevel.set(level, []);
          }
          nodesByLevel.get(level)!.push(nodeId);
        });

        // Calculate positions
        const nodeWidth = 240; // From TaskNode component
        const nodeHeight = 200;
        const horizontalSpacing = 300;
        const verticalSpacing = 280;
        const startX = 100;
        const startY = 100;

        const newPositions = new Map<string, { x: number; y: number }>();

        // Sort levels
        const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

        sortedLevels.forEach((level) => {
          const levelNodes = nodesByLevel.get(level)!;
          const levelY = startY + level * verticalSpacing;
          
          // Calculate total width needed for this level
          const totalWidth = levelNodes.length * horizontalSpacing - (horizontalSpacing - nodeWidth);
          const levelStartX = startX - totalWidth / 2 + nodeWidth / 2;

          levelNodes.forEach((nodeId, index) => {
            const x = levelStartX + index * horizontalSpacing;
            newPositions.set(nodeId, { x, y: levelY });
          });
        });

        // Update node positions
        const updatedNodes = nodes.map((node) => {
          const newPos = newPositions.get(node.id);
          if (newPos) {
            return {
              ...node,
              position: newPos,
              data: {
                ...node.data,
                x: newPos.x,
                y: newPos.y,
              },
            };
          }
          return node;
        });

        setNodes(updatedNodes);

        // Update task positions in the database
        const token = await getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Update all tasks with new positions
        const updatePromises = updatedNodes.map((node) => {
          const task = tasks.find((t) => t.id === node.id);
          if (task && newPositions.has(node.id)) {
            const pos = newPositions.get(node.id)!;
            const updatedTask = {
              ...task,
              x: pos.x,
              y: pos.y,
            };
            return fetch('/api/tasks', {
              method: 'PUT',
              headers,
              body: JSON.stringify(updatedTask),
            });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);

        // Update tasks in state
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            const pos = newPositions.get(task.id);
            if (pos) {
              return { ...task, x: pos.x, y: pos.y };
            }
            return task;
          })
        );
      } catch (error) {
        console.error('Failed to arrange nodes:', error);
        alert('Failed to arrange nodes. Please try again.');
      } finally {
        setIsArranging(false);
      }
    }, 100);
  }, [nodes, edges, tasks, setNodes, setTasks, detectCycle, getAuthToken]);

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
          const token = await getAuthToken();
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          await fetch('/api/tasks', {
            method: 'PUT',
            headers,
            body: JSON.stringify(updatedTask),
          });
        } catch (error) {
          console.error('Failed to save position:', error);
          // Revert on error
          loadData();
        }
      }
    },
    [tasks, nodes, setNodes, loadData, user]
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gray-400 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-500 transition-colors"
          title="Back to Dashboard"
        >
          ← Dashboard
        </button>
        {currentGraph && (
          <div className="bg-white px-4 py-2 rounded-md shadow-lg border border-gray-300">
            <span className="text-sm font-semibold text-gray-700">{currentGraph.name}</span>
          </div>
        )}
        <button
          onClick={handleCreateTask}
          className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isArranging}
        >
          + New Task
        </button>
        <button
          onClick={handleAutoArrange}
          className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={isArranging}
        >
          {isArranging ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Arranging...
            </>
          ) : (
            'Auto Arrange'
          )}
        </button>
        <button
          onClick={handleLogout}
          className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isArranging}
        >
          Logout
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
        edgeTypes={edgeTypes}
        connectionRadius={30}
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
          graphId={graphId}
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
        tasks={tasks}
        selectedWorkflowId={selectedWorkflowId}
        selectedStatus={selectedStatus}
        selectedAssignedTo={selectedAssignedTo}
        onWorkflowChange={setSelectedWorkflowId}
        onStatusChange={setSelectedStatus}
        onAssignedToChange={setSelectedAssignedTo}
        isOpen={isFilterSidebarOpen}
        onToggle={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
      />
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <CanvasPageContent />
    </Suspense>
  );
}

