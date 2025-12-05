import { NextRequest, NextResponse } from 'next/server';
import * as api from '@/lib/api';
import { verifyToken, getAuthToken } from '@/lib/auth';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

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
    const graphs = await api.getAllGraphs();
    return NextResponse.json(graphs);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch graphs';
    console.error('Error fetching graphs:', errorMessage);
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
    const graph = await api.createGraph({
      ...body,
      createdBy: user.email || user.uid || 'unknown',
    });
    return NextResponse.json(graph);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create graph';
    console.error('Error creating graph:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Graph ID is required for update' }, { status: 400 });
    }
    const graph = await api.updateGraph({
      ...body,
      // Note: Graph schema doesn't have updatedBy, only updatedAt
    });
    return NextResponse.json(graph);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update graph' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Graph ID is required' }, { status: 400 });
    }
    await api.deleteGraph(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete graph' }, { status: 500 });
  }
}

