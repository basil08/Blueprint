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
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'backgroundColor', 'foregroundColor', 'createdBy', 'createdAt', 'updatedAt', 'workflow_id', 'x', 'y']);
  } else {
    // Check and migrate workflow to workflow_id if needed
    const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
    const workflowIndex = headers.indexOf('workflow');
    const workflowIdIndex = headers.indexOf('workflow_id');
    
    if (workflowIndex !== -1 && workflowIdIndex === -1) {
      // Migrate: rename workflow column to workflow_id
      tasksSheet.getRange(1, workflowIndex + 1).setValue('workflow_id');
    }
    
    // Check if x and y columns exist, if not add them
    if (headers.indexOf('x') === -1) {
      tasksSheet.getRange(1, tasksSheet.getLastColumn() + 1).setValue('x');
      tasksSheet.getRange(1, tasksSheet.getLastColumn() + 1).setValue('y');
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
        workflow_id: row[workflowIdCol] || '',
        x: row[10] !== undefined && row[10] !== '' ? parseFloat(row[10]) : undefined,
        y: row[11] !== undefined && row[11] !== '' ? parseFloat(row[11]) : undefined
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
        workflow_id: data[i][workflowIdCol] || '',
        x: data[i][10] !== undefined && data[i][10] !== '' ? parseFloat(data[i][10]) : undefined,
        y: data[i][11] !== undefined && data[i][11] !== '' ? parseFloat(data[i][11]) : undefined
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
      
      // Ensure we have enough columns (need 12 columns total: 1 for id + 11 for data)
      if (numCols < 12) {
        // Add missing column headers if needed
        if (numCols === 10) {
          tasksSheet.getRange(1, 11).setValue('x');
          tasksSheet.getRange(1, 12).setValue('y');
        } else if (numCols === 11) {
          tasksSheet.getRange(1, 12).setValue('y');
        }
      }
      
      const updateValues = [
        taskData.title || '',
        taskData.description || '',
        taskData.status || 'Pending',
        taskData.backgroundColor || '#FFFFFF',
        taskData.foregroundColor || '#000000',
        taskData.createdBy || 'admin',
        data[i][7] || now, // Keep original createdAt
        now, // Update updatedAt
        taskData.workflow_id || '',
        taskData.x !== undefined && taskData.x !== null ? taskData.x : (data[i][10] !== undefined && data[i][10] !== '' ? data[i][10] : ''),
        taskData.y !== undefined && taskData.y !== null ? taskData.y : (data[i][11] !== undefined && data[i][11] !== '' ? data[i][11] : '')
      ];
      
      tasksSheet.getRange(i + 1, 2, 1, 11).setValues([updateValues]);
      
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

