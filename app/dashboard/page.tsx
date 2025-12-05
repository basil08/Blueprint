'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Graph } from '@/lib/types';
import { TrashIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import ThemeSwitcher from '@/components/ThemeSwitcher';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [editingGraph, setEditingGraph] = useState<Graph | null>(null);
  const [editGraphName, setEditGraphName] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Get auth token for API calls
  const getAuthToken = async () => {
    if (user) {
      return await user.getIdToken();
    }
    return null;
  };

  // Load graphs
  const loadGraphs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/graphs', { headers });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load graphs');
      }

      const data = await response.json();
      setGraphs(data);
    } catch (error) {
      console.error('Failed to load graphs:', error);
      alert('Failed to load graphs');
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      loadGraphs();
    }
  }, [user, loadGraphs]);

  // Handle create graph
  const handleCreateGraph = useCallback(async () => {
    if (!newGraphName.trim()) {
      alert('Please enter a graph name');
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

      const response = await fetch('/api/graphs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newGraphName.trim() }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create graph');
      }

      const newGraph = await response.json();
      setGraphs([...graphs, newGraph]);
      setNewGraphName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create graph:', error);
      alert('Failed to create graph');
    }
  }, [newGraphName, graphs, user, router]);

  // Handle update graph
  const handleUpdateGraph = useCallback(async () => {
    if (!editingGraph || !editGraphName.trim()) {
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

      const response = await fetch('/api/graphs', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: editingGraph.id, name: editGraphName.trim() }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update graph');
      }

      const updatedGraph = await response.json();
      setGraphs(graphs.map((g) => (g.id === updatedGraph.id ? updatedGraph : g)));
      setEditingGraph(null);
      setEditGraphName('');
    } catch (error) {
      console.error('Failed to update graph:', error);
      alert('Failed to update graph');
    }
  }, [editingGraph, editGraphName, graphs, user, router]);

  // Handle delete graph
  const handleDeleteGraph = useCallback(
    async (graphId: string, graphName: string) => {
      if (!confirm(`Are you sure you want to delete "${graphName}"? This will also delete all tasks, links, and workflows in this graph.`)) {
        return;
      }

      try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/graphs?id=${graphId}`, {
          method: 'DELETE',
          headers,
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to delete graph');
        }

        setGraphs(graphs.filter((g) => g.id !== graphId));
      } catch (error) {
        console.error('Failed to delete graph:', error);
        alert('Failed to delete graph');
      }
    },
    [graphs, user, router]
  );

  // Handle open graph
  const handleOpenGraph = useCallback((graphId: string) => {
    router.push(`/canvas?graph_id=${graphId}`);
  }, [router]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-lg text-black dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Graphs Dashboard</h1>
          <div className="flex gap-2 items-center">
            <ThemeSwitcher />
            <button
              onClick={handleLogout}
              className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6">
          {isCreating ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateGraph();
                  } else if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewGraphName('');
                  }
                }}
                placeholder="Enter graph name"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
                autoFocus
              />
              <button
                onClick={handleCreateGraph}
                className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewGraphName('');
                }}
                className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Graph
            </button>
          )}
        </div>

        {graphs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No graphs yet. Create your first graph to get started!</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {graphs.map((graph) => (
                  <tr
                    key={graph.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleOpenGraph(graph.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingGraph?.id === graph.id ? (
                        <input
                          type="text"
                          value={editGraphName}
                          onChange={(e) => setEditGraphName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateGraph();
                            } else if (e.key === 'Escape') {
                              setEditingGraph(null);
                              setEditGraphName('');
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{graph.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(graph.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(graph.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {editingGraph?.id === graph.id ? (
                          <>
                            <button
                              onClick={handleUpdateGraph}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title="Save"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingGraph(null);
                                setEditGraphName('');
                              }}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Cancel"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGraph(graph);
                                setEditGraphName(graph.name);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGraph(graph.id, graph.name);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

