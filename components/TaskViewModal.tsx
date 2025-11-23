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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
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
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              style={{ color: task.foregroundColor || '#000000' }}
              title="Edit task"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
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

