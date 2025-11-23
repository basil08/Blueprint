# Project Management App

A simple project management application built with Next.js and React Flow, using Google Sheets as the database via Google Apps Script.

# TODO

~~1. Make Task Card fixed sized (compact text with ellipsis), task card can only be changed by manual dragging by user.~~

~~4. Make card remember their position in the graph~~

--

~~2. Make workflow as a first class object~~

~~3. Make emphasis feature based on workflow~~ 

-- 

5. Add authentication system - only ashish and basil

6. Add updated by field

7. Add Assigned To field

8. Add Assigned By field

--

9. Add branding

## Features

- **Visual Task Management**: Create and manage tasks using a React Flow canvas
- **Task Relationships**: Create directed links between tasks (A → B means B is a child of A)
- **Task Properties**: Each task includes:
  - Title and Description
  - Status (Pending, In Process, Completed)
  - Custom background and foreground colors
  - Workflow information
  - Created/Updated timestamps
- **CRUD Operations**: Full Create, Read, Update, Delete functionality
- **Google Sheets Integration**: All data is stored in Google Sheets via Apps Script

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google account (for Google Sheets)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Google Apps Script (see [APPS_SCRIPT_SETUP.md](./APPS_SCRIPT_SETUP.md) for detailed instructions):
   - Copy the code from `appScript.gs`
   - Create a new Google Sheet
   - Open Apps Script editor
   - Paste the code and deploy as a web app
   - Copy the web app URL

3. Configure environment variables:
   - Create a `.env.local` file in the root directory
   - Add: `NEXT_PUBLIC_APPS_SCRIPT_URL=your_apps_script_url_here`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- **Create Task**: Click the "+ New Task" button in the top-left corner
- **Edit Task**: Click the pencil icon on any task node
- **Delete Task**: Click the trash icon on any task node (confirmation required)
- **Create Link**: Drag from one task node to another to create a parent-child relationship
- **View Tasks**: All tasks are displayed as nodes on the canvas with their status, colors, and information

## Project Structure

```
/app
  /api          # Next.js API routes
  page.tsx       # Main React Flow canvas page
/components
  TaskNode.tsx   # Custom task node component
  TaskEditForm.tsx # Task creation/editing form
/lib
  api.ts        # API client for Apps Script
  types.ts      # TypeScript type definitions
appScript.gs    # Google Apps Script code (deploy this)
```

## Technology Stack

- **Next.js 16**: React framework
- **React Flow**: Canvas-based node editor
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Google Apps Script**: Backend API
- **Google Sheets**: Database

## Setup Guide

For detailed setup instructions, see [APPS_SCRIPT_SETUP.md](./APPS_SCRIPT_SETUP.md).
