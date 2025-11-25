'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Workflow } from '@/lib/types';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';

interface TaskEditFormProps {
  task: Task | null;
  onSave: (task: Partial<Task>, setLoading?: (loading: boolean) => void) => Promise<void>;
  onClose: () => void;
  onWorkflowCreated?: () => void;
  graphId?: string | null;
}

export default function TaskEditForm({ task, onSave, onClose, onWorkflowCreated, graphId }: TaskEditFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'Pending',
    backgroundColor: '#FFFFFF',
    foregroundColor: '#000000',
    workflow_id: '',
    assignedTo: '',
  });
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowInput, setWorkflowInput] = useState('');
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  // Get user display name or email
  const getUserDisplayName = () => {
    if (!user) return 'admin';
    return user.displayName || user.email?.split('@')[0] || 'admin';
  };

  // Load workflows - separate effect that doesn't affect form data
  useEffect(() => {
    const loadWorkflows = async () => {
      if (!user || !graphId) {
        setIsLoadingWorkflows(false);
        return;
      }
      setIsLoadingWorkflows(true);
      try {
        const token = await user.getIdToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`/api/workflows?graph_id=${graphId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setWorkflows(data);
          
          // Only update workflow input if we have a task with workflow_id
          if (task?.workflow_id) {
            const selectedWorkflow = data.find((w: Workflow) => w.id === task.workflow_id);
            if (selectedWorkflow) {
              setWorkflowInput(selectedWorkflow.label);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };
    loadWorkflows();
  }, [user, graphId]); // Removed task from dependencies to prevent resets

  // Initialize form data only when task changes (not when workflows change)
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'Pending',
        backgroundColor: task.backgroundColor || '#FFFFFF',
        foregroundColor: task.foregroundColor || '#000000',
        workflow_id: task.workflow_id || '',
        assignedTo: task.assignedTo || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'Pending',
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
        workflow_id: '',
        assignedTo: '',
      });
      setWorkflowInput('');
    }
  }, [task]); // Only depend on task, not workflows

  // Sync workflow input label when workflow_id changes in formData (only if workflows are loaded)
  useEffect(() => {
    if (!isLoadingWorkflows && workflows.length > 0 && formData.workflow_id) {
      const selectedWorkflow = workflows.find(w => w.id === formData.workflow_id);
      if (selectedWorkflow && selectedWorkflow.label !== workflowInput) {
        setWorkflowInput(selectedWorkflow.label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.workflow_id, isLoadingWorkflows]); // Only sync when workflow_id or loading state changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Task title is required');
      return;
    }

    if (isSaving) return; // Prevent double submission

    const now = new Date().toISOString();
    const userDisplayName = getUserDisplayName();
    const taskToSave: Partial<Task> = {
      ...(task?.id && { id: task.id }),
      title: formData.title || '',
      description: formData.description || '',
      status: (formData.status as TaskStatus) || 'Pending',
      backgroundColor: formData.backgroundColor || '#FFFFFF',
      foregroundColor: formData.foregroundColor || '#000000',
      createdBy: task?.createdBy || userDisplayName,
      updatedBy: userDisplayName,
      assignedTo: formData.assignedTo || '',
      assignedBy: formData.assignedTo ? userDisplayName : '',
      ...(task?.createdAt && { createdAt: task.createdAt }),
      updatedAt: now,
      workflow_id: formData.workflow_id || '',
    };

    await onSave(taskToSave, setIsSaving);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto text-black">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-black">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors text-black"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {isLoadingWorkflows && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching workflow values...
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={isLoadingWorkflows || isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Task Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isLoadingWorkflows || isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
              disabled={isLoadingWorkflows || isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                disabled={isLoadingWorkflows || isSaving}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                type="text"
                value={formData.backgroundColor}
                onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                disabled={isLoadingWorkflows || isSaving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Foreground Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.foregroundColor}
                onChange={(e) => setFormData(prev => ({ ...prev, foregroundColor: e.target.value }))}
                disabled={isLoadingWorkflows || isSaving}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                type="text"
                value={formData.foregroundColor}
                onChange={(e) => setFormData(prev => ({ ...prev, foregroundColor: e.target.value }))}
                disabled={isLoadingWorkflows || isSaving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Assign To</label>
            <select
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
              disabled={isLoadingWorkflows || isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              <option value="basil">basil</option>
              <option value="ashish">ashish</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Task Workflow</label>
            <div className="flex gap-2">
              <select
                value={formData.workflow_id || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, workflow_id: e.target.value }));
                  const selected = workflows.find(w => w.id === e.target.value);
                  setWorkflowInput(selected?.label || '');
                }}
                disabled={isLoadingWorkflows || isSaving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No Workflow</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={workflowInput}
                onChange={(e) => {
                  setWorkflowInput(e.target.value);
                  // Check if it matches an existing workflow
                  const matching = workflows.find(w => w.label.toLowerCase() === e.target.value.toLowerCase());
                  if (matching) {
                    setFormData(prev => ({ ...prev, workflow_id: matching.id }));
                  } else {
                    setFormData(prev => ({ ...prev, workflow_id: '' }));
                  }
                }}
                disabled={isLoadingWorkflows || isSaving}
                placeholder="Type to create new workflow"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {workflowInput && !workflows.find(w => w.label.toLowerCase() === workflowInput.toLowerCase()) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!workflowInput.trim() || !user) return;
                    setIsCreatingWorkflow(true);
                    try {
                      const token = await user.getIdToken();
                      const headers: HeadersInit = {
                        'Content-Type': 'application/json',
                      };
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }
                      const response = await fetch('/api/workflows', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ 
                          label: workflowInput.trim(),
                          graph_id: graphId || '',
                        }),
                      });
                      if (response.ok) {
                        const newWorkflow = await response.json();
                        setWorkflows(prev => [...prev, newWorkflow]);
                        setFormData(prev => ({ ...prev, workflow_id: newWorkflow.id }));
                        setWorkflowInput(newWorkflow.label);
                        if (onWorkflowCreated) onWorkflowCreated();
                      } else {
                        alert('Failed to create workflow');
                      }
                    } catch (error) {
                      console.error('Failed to create workflow:', error);
                      alert('Failed to create workflow');
                    } finally {
                      setIsCreatingWorkflow(false);
                    }
                  }}
                  disabled={isCreatingWorkflow}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Create new workflow"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? (task ? 'Updating...' : 'Creating...') : (task ? 'Update Task' : 'Create Task')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

