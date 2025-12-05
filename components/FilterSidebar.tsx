'use client';

import React, { useMemo } from 'react';
import { Workflow, TaskStatus, Task } from '@/lib/types';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

type DueDateFilter = 'today' | 'next-week' | null;

interface FilterSidebarProps {
  workflows: Workflow[];
  tasks: Task[];
  selectedWorkflowId: string | null;
  selectedStatus: TaskStatus | null;
  selectedAssignedTo: string | null;
  selectedDueDateFilter: DueDateFilter;
  onWorkflowChange: (workflowId: string | null) => void;
  onStatusChange: (status: TaskStatus | null) => void;
  onAssignedToChange: (assignedTo: string | null) => void;
  onDueDateFilterChange: (filter: DueDateFilter) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FilterSidebar({
  workflows,
  tasks,
  selectedWorkflowId,
  selectedStatus,
  selectedAssignedTo,
  selectedDueDateFilter,
  onWorkflowChange,
  onStatusChange,
  onAssignedToChange,
  onDueDateFilterChange,
  isOpen,
  onToggle,
}: FilterSidebarProps) {
  const hasActiveFilters = selectedWorkflowId !== null || selectedStatus !== null || selectedAssignedTo !== null || selectedDueDateFilter !== null;

  // Get unique assignedTo values from tasks (including comma-separated values)
  const assignedToOptions = useMemo(() => {
    const assignedToSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignedTo && task.assignedTo.trim()) {
        // Split by comma and add each assignee
        task.assignedTo.split(',').forEach(assignee => {
          const trimmed = assignee.trim();
          if (trimmed) {
            assignedToSet.add(trimmed);
          }
        });
      }
    });
    return Array.from(assignedToSet).sort();
  }, [tasks]);

  return (
    <>
      <button
        onClick={onToggle}
        className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-black dark:text-white"
      >
        <FunnelIcon className="w-5 h-5" />
        Filters
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {(selectedWorkflowId ? 1 : 0) + (selectedStatus ? 1 : 0) + (selectedAssignedTo ? 1 : 0) + (selectedDueDateFilter ? 1 : 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-20 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-black dark:text-white">Filters</h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-black dark:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-white">Workflow</label>
              <select
                value={selectedWorkflowId || ''}
                onChange={(e) => onWorkflowChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
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
              <label className="block text-sm font-medium mb-2 text-black dark:text-white">Status</label>
              <select
                value={selectedStatus || ''}
                onChange={(e) => onStatusChange((e.target.value as TaskStatus) || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Process">In Process</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-white">Assigned To</label>
              <select
                value={selectedAssignedTo || ''}
                onChange={(e) => onAssignedToChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="">All Assignees</option>
                {assignedToOptions.length > 0 ? (
                  assignedToOptions.map((assignedTo) => (
                    <option key={assignedTo} value={assignedTo}>
                      {assignedTo}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No assignments found</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-white">Due Date</label>
              <select
                value={selectedDueDateFilter || ''}
                onChange={(e) => onDueDateFilterChange((e.target.value as DueDateFilter) || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="">All Tasks</option>
                <option value="today">Due Today</option>
                <option value="next-week">Due Next Week</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  onWorkflowChange(null);
                  onStatusChange(null);
                  onAssignedToChange(null);
                  onDueDateFilterChange(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

