// Google Apps Script for Task Management
// Deploy this as a web app with execute as: Me, access: Anyone

// Configuration
const SHEET_NAME = 'Tasks';
const LINKS_SHEET_NAME = 'Links';
const WORKFLOWS_SHEET_NAME = 'Workflows';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function doPut(e) {
  return handleRequest(e);
}

function doDelete(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const method = e.parameter.method || e.parameter._method || 'GET';
    
    switch(method.toUpperCase()) {
      case 'GET':
        return handleGet(e);
      case 'POST':
        return handlePost(e);
      case 'PUT':
        return handlePut(e);
      case 'DELETE':
        return handleDelete(e);
      default:
        return ContentService.createTextOutput(JSON.stringify({ error: 'Method not allowed' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGet(e) {
  const type = e.parameter.type;
  
  if (type === 'tasks') {
    return getAllTasks();
  } else if (type === 'links') {
    return getAllLinks();
  } else if (type === 'workflows') {
    return getAllWorkflows();
  } else if (type === 'task' && e.parameter.id) {
    return getTask(e.parameter.id);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handlePost(e) {
  const type = e.parameter.type;
  const postData = JSON.parse(e.postData.contents || '{}');
  
  if (type === 'task') {
    return createTask(postData);
  } else if (type === 'link') {
    return createLink(postData);
  } else if (type === 'workflow') {
    return createWorkflow(postData);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handlePut(e) {
  const postData = JSON.parse(e.postData.contents || '{}');
  const type = e.parameter.type;
  
  if (type === 'task') {
    return updateTask(postData);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleDelete(e) {
  const type = e.parameter.type;
  const id = e.parameter.id;
  
  if (type === 'task' && id) {
    return deleteTask(id);
  } else if (type === 'link' && id) {
    return deleteLink(id);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Initialize sheets if they don't exist
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Initialize Tasks sheet
  let tasksSheet = ss.getSheetByName(SHEET_NAME);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(SHEET_NAME);
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'backgroundColor', 'foregroundColor', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', 'assignedTo', 'assignedBy', 'workflow_id', 'x', 'y']);
  } else {
    // Check and migrate workflow to workflow_id if needed
    const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
    const workflowIndex = headers.indexOf('workflow');
    const workflowIdIndex = headers.indexOf('workflow_id');
    
    if (workflowIndex !== -1 && workflowIdIndex === -1) {
      // Migrate: rename workflow column to workflow_id
      tasksSheet.getRange(1, workflowIndex + 1).setValue('workflow_id');
    }
    
    // Check if new fields exist, if not add them
    const lastCol = tasksSheet.getLastColumn();
    let colIndex = lastCol;
    if (headers.indexOf('updatedBy') === -1) {
      tasksSheet.getRange(1, colIndex + 1).setValue('updatedBy');
      colIndex++;
    }
    if (headers.indexOf('assignedTo') === -1) {
      tasksSheet.getRange(1, colIndex + 1).setValue('assignedTo');
      colIndex++;
    }
    if (headers.indexOf('assignedBy') === -1) {
      tasksSheet.getRange(1, colIndex + 1).setValue('assignedBy');
      colIndex++;
    }
    
    // Check if x and y columns exist, if not add them
    if (headers.indexOf('x') === -1) {
      tasksSheet.getRange(1, colIndex + 1).setValue('x');
      colIndex++;
      tasksSheet.getRange(1, colIndex + 1).setValue('y');
    }
  }
  
  // Initialize Links sheet
  let linksSheet = ss.getSheetByName(LINKS_SHEET_NAME);
  if (!linksSheet) {
    linksSheet = ss.insertSheet(LINKS_SHEET_NAME);
    linksSheet.appendRow(['id', 'source', 'target']);
  }
  
  // Initialize Workflows sheet
  let workflowsSheet = ss.getSheetByName(WORKFLOWS_SHEET_NAME);
  if (!workflowsSheet) {
    workflowsSheet = ss.insertSheet(WORKFLOWS_SHEET_NAME);
    workflowsSheet.appendRow(['id', 'label']);
  }
  
  return { tasksSheet, linksSheet, workflowsSheet };
}

// Task CRUD operations
function getAllTasks() {
  const { tasksSheet } = initializeSheets();
  const data = tasksSheet.getDataRange().getValues();
  const headers = data[0];
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      // Find workflow_id column index
      const workflowIdIndex = headers.indexOf('workflow_id');
      const workflowIndex = headers.indexOf('workflow'); // For backward compatibility
      const workflowIdCol = workflowIdIndex !== -1 ? workflowIdIndex : (workflowIndex !== -1 ? workflowIndex : 9);
      
      const updatedByIndex = headers.indexOf('updatedBy');
      const assignedToIndex = headers.indexOf('assignedTo');
      const assignedByIndex = headers.indexOf('assignedBy');
      const xIndex = headers.indexOf('x');
      const yIndex = headers.indexOf('y');
      
      tasks.push({
        id: row[0],
        title: row[1] || '',
        description: row[2] || '',
        status: row[3] || 'Pending',
        backgroundColor: row[4] || '#FFFFFF',
        foregroundColor: row[5] || '#000000',
        createdBy: row[6] || 'admin',
        createdAt: row[7] || '',
        updatedAt: row[8] || '',
        updatedBy: updatedByIndex !== -1 ? (row[updatedByIndex] || '') : '',
        assignedTo: assignedToIndex !== -1 ? (row[assignedToIndex] || '') : '',
        assignedBy: assignedByIndex !== -1 ? (row[assignedByIndex] || '') : '',
        workflow_id: row[workflowIdCol] || '',
        x: xIndex !== -1 && row[xIndex] !== undefined && row[xIndex] !== '' ? parseFloat(row[xIndex]) : undefined,
        y: yIndex !== -1 && row[yIndex] !== undefined && row[yIndex] !== '' ? parseFloat(row[yIndex]) : undefined
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(tasks))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTask(id) {
  const { tasksSheet } = initializeSheets();
  const data = tasksSheet.getDataRange().getValues();
  const headers = data[0];
  const workflowIdIndex = headers.indexOf('workflow_id');
  const workflowIndex = headers.indexOf('workflow');
  const workflowIdCol = workflowIdIndex !== -1 ? workflowIdIndex : (workflowIndex !== -1 ? workflowIndex : 9);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const updatedByIndex = headers.indexOf('updatedBy');
      const assignedToIndex = headers.indexOf('assignedTo');
      const assignedByIndex = headers.indexOf('assignedBy');
      const xIndex = headers.indexOf('x');
      const yIndex = headers.indexOf('y');
      
      return ContentService.createTextOutput(JSON.stringify({
        id: data[i][0],
        title: data[i][1] || '',
        description: data[i][2] || '',
        status: data[i][3] || 'Pending',
        backgroundColor: data[i][4] || '#FFFFFF',
        foregroundColor: data[i][5] || '#000000',
        createdBy: data[i][6] || 'admin',
        createdAt: data[i][7] || '',
        updatedAt: data[i][8] || '',
        updatedBy: updatedByIndex !== -1 ? (data[i][updatedByIndex] || '') : '',
        assignedTo: assignedToIndex !== -1 ? (data[i][assignedToIndex] || '') : '',
        assignedBy: assignedByIndex !== -1 ? (data[i][assignedByIndex] || '') : '',
        workflow_id: data[i][workflowIdCol] || '',
        x: xIndex !== -1 && data[i][xIndex] !== undefined && data[i][xIndex] !== '' ? parseFloat(data[i][xIndex]) : undefined,
        y: yIndex !== -1 && data[i][yIndex] !== undefined && data[i][yIndex] !== '' ? parseFloat(data[i][yIndex]) : undefined
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Task not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createTask(taskData) {
  const { tasksSheet } = initializeSheets();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  
  tasksSheet.appendRow([
    id,
    taskData.title || '',
    taskData.description || '',
    taskData.status || 'Pending',
    taskData.backgroundColor || '#FFFFFF',
    taskData.foregroundColor || '#000000',
    taskData.createdBy || 'admin',
    now,
    now,
    taskData.updatedBy || '',
    taskData.assignedTo || '',
    taskData.assignedBy || '',
    taskData.workflow_id || '',
    taskData.x !== undefined ? taskData.x : '',
    taskData.y !== undefined ? taskData.y : ''
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    ...taskData,
    createdAt: now,
    updatedAt: now
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateTask(taskData) {
  const { tasksSheet } = initializeSheets();
  const data = tasksSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskData.id) {
      const now = new Date().toISOString();
      // Update all fields including x and y
      const numCols = tasksSheet.getLastColumn();
      
      const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
      const updatedByIndex = headers.indexOf('updatedBy');
      const assignedToIndex = headers.indexOf('assignedTo');
      const assignedByIndex = headers.indexOf('assignedBy');
      const xIndex = headers.indexOf('x');
      const yIndex = headers.indexOf('y');
      const workflowIdIndex = headers.indexOf('workflow_id');
      
      // Build update values array based on column positions
      const updateValues = [];
      // title (col 2)
      updateValues[0] = taskData.title || '';
      // description (col 3)
      updateValues[1] = taskData.description || '';
      // status (col 4)
      updateValues[2] = taskData.status || 'Pending';
      // backgroundColor (col 5)
      updateValues[3] = taskData.backgroundColor || '#FFFFFF';
      // foregroundColor (col 6)
      updateValues[4] = taskData.foregroundColor || '#000000';
      // createdBy (col 7)
      updateValues[5] = taskData.createdBy || data[i][6] || 'admin';
      // createdAt (col 8) - keep original
      updateValues[6] = data[i][7] || now;
      // updatedAt (col 9)
      updateValues[7] = now;
      // updatedBy (col 10)
      updateValues[8] = taskData.updatedBy || (updatedByIndex !== -1 ? data[i][updatedByIndex] : '');
      // assignedTo (col 11)
      updateValues[9] = taskData.assignedTo !== undefined ? (taskData.assignedTo || '') : (assignedToIndex !== -1 ? data[i][assignedToIndex] : '');
      // assignedBy (col 12)
      updateValues[10] = taskData.assignedBy || (assignedByIndex !== -1 ? data[i][assignedByIndex] : '');
      // workflow_id (col 13)
      updateValues[11] = taskData.workflow_id !== undefined ? (taskData.workflow_id || '') : (workflowIdIndex !== -1 ? data[i][workflowIdIndex] : '');
      // x (col 14)
      updateValues[12] = taskData.x !== undefined && taskData.x !== null ? taskData.x : (xIndex !== -1 && data[i][xIndex] !== undefined && data[i][xIndex] !== '' ? data[i][xIndex] : '');
      // y (col 15)
      updateValues[13] = taskData.y !== undefined && taskData.y !== null ? taskData.y : (yIndex !== -1 && data[i][yIndex] !== undefined && data[i][yIndex] !== '' ? data[i][yIndex] : '');
      
      tasksSheet.getRange(i + 1, 2, 1, updateValues.length).setValues([updateValues]);
      
      return ContentService.createTextOutput(JSON.stringify({
        ...taskData,
        updatedAt: now
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Task not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteTask(id) {
  const { tasksSheet, linksSheet } = initializeSheets();
  const taskData = tasksSheet.getDataRange().getValues();
  
  // Find and delete task
  for (let i = 1; i < taskData.length; i++) {
    if (taskData[i][0] === id) {
      tasksSheet.deleteRow(i + 1);
      
      // Delete all links associated with this task
      const linkData = linksSheet.getDataRange().getValues();
      for (let j = linkData.length - 1; j >= 1; j--) {
        if (linkData[j][1] === id || linkData[j][2] === id) {
          linksSheet.deleteRow(j + 1);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Task not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Link CRUD operations
function getAllLinks() {
  const { linksSheet } = initializeSheets();
  const data = linksSheet.getDataRange().getValues();
  const links = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      links.push({
        id: row[0],
        source: row[1],
        target: row[2]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(links))
    .setMimeType(ContentService.MimeType.JSON);
}

function createLink(linkData) {
  const { linksSheet } = initializeSheets();
  const id = Utilities.getUuid();
  
  linksSheet.appendRow([
    id,
    linkData.source,
    linkData.target
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    source: linkData.source,
    target: linkData.target
  })).setMimeType(ContentService.MimeType.JSON);
}

function deleteLink(id) {
  const { linksSheet } = initializeSheets();
  const data = linksSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      linksSheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Link not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Workflow CRUD operations
function getAllWorkflows() {
  const { workflowsSheet } = initializeSheets();
  const data = workflowsSheet.getDataRange().getValues();
  const workflows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      workflows.push({
        id: row[0],
        label: row[1] || ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(workflows))
    .setMimeType(ContentService.MimeType.JSON);
}

function createWorkflow(workflowData) {
  const { workflowsSheet } = initializeSheets();
  const id = Utilities.getUuid();
  
  workflowsSheet.appendRow([
    id,
    workflowData.label || ''
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    label: workflowData.label || ''
  })).setMimeType(ContentService.MimeType.JSON);
}

