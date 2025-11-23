'use client';

import React from 'react';
import { Workflow, TaskStatus } from '@/lib/types';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FilterSidebarProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  selectedStatus: TaskStatus | null;
  onWorkflowChange: (workflowId: string | null) => void;
  onStatusChange: (status: TaskStatus | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FilterSidebar({
  workflows,
  selectedWorkflowId,
  selectedStatus,
  onWorkflowChange,
  onStatusChange,
  isOpen,
  onToggle,
}: FilterSidebarProps) {
  const hasActiveFilters = selectedWorkflowId !== null || selectedStatus !== null;

  return (
    <>
      <button
        onClick={onToggle}
        className="absolute top-4 right-4 z-10 bg-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
      >
        <FunnelIcon className="w-5 h-5" />
        Filters
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {(selectedWorkflowId ? 1 : 0) + (selectedStatus ? 1 : 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl z-20 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Workflow</label>
              <select
                value={selectedWorkflowId || ''}
                onChange={(e) => onWorkflowChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Workflows</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={selectedStatus || ''}
                onChange={(e) => onStatusChange((e.target.value as TaskStatus) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Process">In Process</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  onWorkflowChange(null);
                  onStatusChange(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

