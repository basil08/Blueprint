import { NextRequest, NextResponse } from 'next/server';
import * as api from '@/lib/api';

export async function GET() {
  try {
    const tasks = await api.getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
    console.error('Error fetching tasks:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await api.createTask(body);
    return NextResponse.json(task);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
    console.error('Error creating task:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Task ID is required for update' }, { status: 400 });
    }
    const task = await api.updateTask(body);
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    await api.deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

