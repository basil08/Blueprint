import { NextRequest, NextResponse } from 'next/server';
import * as api from '@/lib/api';
import { verifyToken, getAuthToken } from '@/lib/auth';

async function checkAuth(request: NextRequest): Promise<{ uid: string; email: string | null; displayName: string | null } | null> {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }
  return await verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graph_id');
    const workflows = await api.getAllWorkflows(graphId || undefined);
    return NextResponse.json(workflows);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch workflows';
    console.error('Error fetching workflows:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const workflow = await api.createWorkflow(body);
    return NextResponse.json(workflow);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
    console.error('Error creating workflow:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

