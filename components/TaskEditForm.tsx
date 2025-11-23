'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Workflow } from '@/lib/types';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface TaskEditFormProps {
  task: Task | null;
  onSave: (task: Partial<Task>, setLoading?: (loading: boolean) => void) => Promise<void>;
  onClose: () => void;
  onWorkflowCreated?: () => void;
}

export default function TaskEditForm({ task, onSave, onClose, onWorkflowCreated }: TaskEditFormProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'Pending',
    backgroundColor: '#FFFFFF',
    foregroundColor: '#000000',
    workflow_id: '',
  });
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowInput, setWorkflowInput] = useState('');
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load workflows
    const loadWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const data = await response.json();
          setWorkflows(data);
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
      }
    };
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        backgroundColor: task.backgroundColor,
        foregroundColor: task.foregroundColor,
        workflow_id: task.workflow_id,
      });
      // Set workflow input to the label of the selected workflow
      if (task.workflow_id) {
        const selectedWorkflow = workflows.find(w => w.id === task.workflow_id);
        setWorkflowInput(selectedWorkflow?.label || '');
      }
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'Pending',
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
        workflow_id: '',
      });
      setWorkflowInput('');
    }
  }, [task, workflows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Task title is required');
      return;
    }

    if (isSaving) return; // Prevent double submission

    const now = new Date().toISOString();
    const taskToSave: Partial<Task> = {
      ...(task?.id && { id: task.id }),
      title: formData.title || '',
      description: formData.description || '',
      status: (formData.status as TaskStatus) || 'Pending',
      backgroundColor: formData.backgroundColor || '#FFFFFF',
      foregroundColor: formData.foregroundColor || '#000000',
      createdBy: task?.createdBy || 'admin',
      ...(task?.createdAt && { createdAt: task.createdAt }),
      updatedAt: now,
      workflow_id: formData.workflow_id || '',
    };

    await onSave(taskToSave, setIsSaving);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Task Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Foreground Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.foregroundColor}
                onChange={(e) => setFormData({ ...formData, foregroundColor: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.foregroundColor}
                onChange={(e) => setFormData({ ...formData, foregroundColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Task Workflow</label>
            <div className="flex gap-2">
              <select
                value={formData.workflow_id || ''}
                onChange={(e) => {
                  setFormData({ ...formData, workflow_id: e.target.value });
                  const selected = workflows.find(w => w.id === e.target.value);
                  setWorkflowInput(selected?.label || '');
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setFormData({ ...formData, workflow_id: matching.id });
                  } else {
                    setFormData({ ...formData, workflow_id: '' });
                  }
                }}
                placeholder="Type to create new workflow"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {workflowInput && !workflows.find(w => w.label.toLowerCase() === workflowInput.toLowerCase()) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!workflowInput.trim()) return;
                    setIsCreatingWorkflow(true);
                    try {
                      const response = await fetch('/api/workflows', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ label: workflowInput.trim() }),
                      });
                      if (response.ok) {
                        const newWorkflow = await response.json();
                        setWorkflows([...workflows, newWorkflow]);
                        setFormData({ ...formData, workflow_id: newWorkflow.id });
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

