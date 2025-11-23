'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Task } from '@/lib/types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Component to render description with clickable links
function DescriptionWithLinks({ description, foregroundColor }: { description: string; foregroundColor: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = description.split(urlRegex);
  let linkIndex = 1;
  const linkMap = new Map<string, string>();

  const processedParts = parts.map((part, index) => {
    // Check if part matches URL pattern (starts with http:// or https://)
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
    <p className="text-xs line-clamp-3 overflow-hidden" style={{ color: foregroundColor, opacity: 0.8 }}>
      {processedParts}
    </p>
  );
}

interface TaskNodeData extends Task {
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
  workflowLabel?: string;
  isFiltered?: boolean;
}

export default function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const statusColors = {
    'Pending': '#FBBF24',
    'In Process': '#3B82F6',
    'Completed': '#10B981'
  };

  return (
    <div
      className="rounded-lg shadow-lg border-2 border-gray-300 cursor-pointer"
      style={{
        backgroundColor: data.backgroundColor || '#FFFFFF',
        color: data.foregroundColor || '#000000',
        width: '240px', // Fixed width
        height: '200px', // Fixed height (1.2:1 ratio: 240/200 = 1.2)
      }}
      onClick={(e) => {
        // Only trigger view if clicking on the card itself, not on buttons
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.task-content')) {
          data.onView(data);
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      
      <div className="p-3 h-full flex flex-col task-content">
        <div className="flex items-start justify-between mb-2 flex-shrink-0">
          <h3 
            className="font-semibold text-sm flex-1 mr-2 truncate" 
            style={{ color: data.foregroundColor || '#000000' }}
            title={data.title || 'Untitled Task'}
          >
            {data.title || 'Untitled Task'}
          </h3>
          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              style={{ color: data.foregroundColor || '#000000' }}
              title="Edit task"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete(data.id);
              }}
              className="p-1 hover:bg-red-200 rounded transition-colors"
              style={{ color: data.foregroundColor || '#000000' }}
              title="Delete task"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {data.description && (
          <div className="flex-1 min-h-0 mb-2">
            <DescriptionWithLinks 
              description={data.description} 
              foregroundColor={data.foregroundColor || '#000000'} 
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: statusColors[data.status] || '#FBBF24',
              color: '#FFFFFF'
            }}
          >
            {data.status}
          </span>
        </div>
        
        {data.workflowLabel && (
          <p 
            className="text-xs italic truncate flex-shrink-0" 
            style={{ color: data.foregroundColor || '#000000', opacity: 0.6 }}
            title={data.workflowLabel}
          >
            {data.workflowLabel}
          </p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

