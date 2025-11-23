import { NextRequest, NextResponse } from 'next/server';
import * as api from '@/lib/api';

export async function GET() {
  try {
    const workflows = await api.getAllWorkflows();
    return NextResponse.json(workflows);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch workflows';
    console.error('Error fetching workflows:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workflow = await api.createWorkflow(body);
    return NextResponse.json(workflow);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
    console.error('Error creating workflow:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

