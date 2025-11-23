import { NextRequest, NextResponse } from 'next/server';
import * as api from '@/lib/api';

export async function GET() {
  try {
    const links = await api.getAllLinks();
    return NextResponse.json(links);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const link = await api.createLink(body);
    return NextResponse.json(link);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }
    await api.deleteLink(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}

