'use client';

import React from 'react';
import { Task, Workflow } from '@/lib/types';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface TaskViewModalProps {
  task: Task | null;
  workflows: Workflow[];
  onEdit: (task: Task) => void;
  onClose: () => void;
}

// Component to render description with clickable links
function DescriptionWithLinks({ description, foregroundColor }: { description: string; foregroundColor: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = description.split(urlRegex);
  let linkIndex = 1;
  const linkMap = new Map<string, string>();

  const processedParts = parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      if (!linkMap.has(part)) {
        linkMap.set(part, `Link ${linkIndex++}`);
      }
      const linkLabel = linkMap.get(part)!;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          style={{ color: foregroundColor }}
          title={part}
        >
          {linkLabel}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });

  return (
    <p className="text-sm whitespace-pre-wrap" style={{ color: foregroundColor, opacity: 0.9 }}>
      {processedParts}
    </p>
  );
}

export default function TaskViewModal({ task, workflows, onEdit, onClose }: TaskViewModalProps) {
  if (!task) return null;

  const statusColors = {
    'Pending': '#FBBF24',
    'In Process': '#3B82F6',
    'Completed': '#10B981'
  };

  // Format assignees for display
  const assignees = task.assignedTo 
    ? task.assignedTo.split(',').map(a => a.trim()).filter(a => a)
    : [];

  // Format due date for display
  const dueDateDisplay = task.dueDate 
    ? new Date(task.dueDate).toLocaleDateString()
    : null;
  
  // Check if due date is overdue or due soon
  const getDueDateStatus = () => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 7) return 'due-soon';
    return null;
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: task.backgroundColor || '#FFFFFF',
          color: task.foregroundColor || '#000000',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: task.foregroundColor || '#000000', opacity: 0.2 }}>
          <h2 className="text-xl font-semibold" style={{ color: task.foregroundColor || '#000000' }}>
            {task.title || 'Untitled Task'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              style={{ color: task.foregroundColor || '#000000' }}
              title="Edit task"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              style={{ color: task.foregroundColor || '#000000' }}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
              Task Description
            </label>
            {task.description ? (
              <DescriptionWithLinks 
                description={task.description} 
                foregroundColor={task.foregroundColor || '#000000'} 
              />
            ) : (
              <p className="text-sm italic" style={{ color: task.foregroundColor || '#000000', opacity: 0.5 }}>
                No description provided
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
              Status
            </label>
            <span
              className="inline-block px-3 py-1 rounded text-sm font-medium"
              style={{
                backgroundColor: statusColors[task.status] || '#FBBF24',
                color: '#FFFFFF'
              }}
            >
              {task.status}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
              Task Workflow
            </label>
            {task.workflow_id ? (
              <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                {workflows.find(w => w.id === task.workflow_id)?.label || 'Unknown Workflow'}
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: task.foregroundColor || '#000000', opacity: 0.5 }}>
                No workflow specified
              </p>
            )}
          </div>

          {assignees.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                Assigned To
              </label>
              <div className="flex flex-wrap gap-2">
                {assignees.map((assignee, index) => (
                  <span
                    key={index}
                    className="inline-block px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: task.foregroundColor || '#000000',
                      color: task.backgroundColor || '#FFFFFF',
                      opacity: 0.2,
                    }}
                  >
                    {assignee}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dueDateDisplay && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                Due Date
              </label>
              <div className="flex items-center gap-2">
                <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                  {dueDateDisplay}
                </p>
                {dueDateStatus === 'overdue' && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white">
                    Overdue
                  </span>
                )}
                {dueDateStatus === 'due-today' && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500 text-white">
                    Due Today
                  </span>
                )}
                {dueDateStatus === 'due-soon' && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500 text-white">
                    Due Soon
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: task.foregroundColor || '#000000', opacity: 0.2 }}>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                Created By
              </label>
              <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                {task.createdBy || 'admin'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                Created At
              </label>
              <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                Updated At
              </label>
              <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            {(task.x !== undefined || task.y !== undefined) && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: task.foregroundColor || '#000000', opacity: 0.7 }}>
                  Position
                </label>
                <p className="text-sm" style={{ color: task.foregroundColor || '#000000', opacity: 0.9 }}>
                  ({Math.round(task.x || 0)}, {Math.round(task.y || 0)})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

