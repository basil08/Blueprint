// Google Apps Script for Task Management
// Deploy this as a web app with execute as: Me, access: Anyone

// Configuration
const SHEET_NAME = 'Tasks';
const LINKS_SHEET_NAME = 'Links';
const WORKFLOWS_SHEET_NAME = 'Workflows';
const GRAPHS_SHEET_NAME = 'Graphs';

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
  const graphId = e.parameter.graph_id;
  
  if (type === 'graphs') {
    return getAllGraphs();
  } else if (type === 'graph' && e.parameter.id) {
    return getGraph(e.parameter.id);
  } else if (type === 'tasks') {
    return getAllTasks(graphId);
  } else if (type === 'links') {
    return getAllLinks(graphId);
  } else if (type === 'workflows') {
    return getAllWorkflows(graphId);
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
  
  if (type === 'graph') {
    return createGraph(postData);
  } else if (type === 'task') {
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
  
  if (type === 'graph') {
    return updateGraph(postData);
  } else if (type === 'task') {
    return updateTask(postData);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleDelete(e) {
  const type = e.parameter.type;
  const id = e.parameter.id;
  
  if (type === 'graph' && id) {
    return deleteGraph(id);
  } else if (type === 'task' && id) {
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
  
  // Initialize Graphs sheet
  let graphsSheet = ss.getSheetByName(GRAPHS_SHEET_NAME);
  if (!graphsSheet) {
    graphsSheet = ss.insertSheet(GRAPHS_SHEET_NAME);
    graphsSheet.appendRow(['id', 'name', 'createdBy', 'createdAt', 'updatedAt']);
  }
  
  // Initialize Tasks sheet
  let tasksSheet = ss.getSheetByName(SHEET_NAME);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(SHEET_NAME);
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'backgroundColor', 'foregroundColor', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', 'assignedTo', 'assignedBy', 'workflow_id', 'graph_id', 'x', 'y']);
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
    
    // Check if graph_id column exists, if not add it
    if (headers.indexOf('graph_id') === -1) {
      tasksSheet.getRange(1, colIndex + 1).setValue('graph_id');
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
    linksSheet.appendRow(['id', 'source', 'target', 'graph_id']);
  } else {
    // Check if graph_id column exists, if not add it
    const headers = linksSheet.getRange(1, 1, 1, linksSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('graph_id') === -1) {
      const lastCol = linksSheet.getLastColumn();
      linksSheet.getRange(1, lastCol + 1).setValue('graph_id');
    }
  }
  
  // Initialize Workflows sheet
  let workflowsSheet = ss.getSheetByName(WORKFLOWS_SHEET_NAME);
  if (!workflowsSheet) {
    workflowsSheet = ss.insertSheet(WORKFLOWS_SHEET_NAME);
    workflowsSheet.appendRow(['id', 'label', 'graph_id']);
  } else {
    // Check if graph_id column exists, if not add it
    const headers = workflowsSheet.getRange(1, 1, 1, workflowsSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('graph_id') === -1) {
      const lastCol = workflowsSheet.getLastColumn();
      workflowsSheet.getRange(1, lastCol + 1).setValue('graph_id');
    }
  }
  
  return { graphsSheet, tasksSheet, linksSheet, workflowsSheet };
}

// Graph CRUD operations
function getAllGraphs() {
  const { graphsSheet } = initializeSheets();
  const data = graphsSheet.getDataRange().getValues();
  const graphs = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      graphs.push({
        id: row[0],
        name: row[1] || '',
        createdBy: row[2] || '',
        createdAt: row[3] || '',
        updatedAt: row[4] || ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(graphs))
    .setMimeType(ContentService.MimeType.JSON);
}

function getGraph(id) {
  const { graphsSheet } = initializeSheets();
  const data = graphsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return ContentService.createTextOutput(JSON.stringify({
        id: data[i][0],
        name: data[i][1] || '',
        createdBy: data[i][2] || '',
        createdAt: data[i][3] || '',
        updatedAt: data[i][4] || ''
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Graph not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createGraph(graphData) {
  const { graphsSheet } = initializeSheets();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  
  graphsSheet.appendRow([
    id,
    graphData.name || '',
    graphData.createdBy || '',
    now,
    now
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    name: graphData.name || '',
    createdBy: graphData.createdBy || '',
    createdAt: now,
    updatedAt: now
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateGraph(graphData) {
  const { graphsSheet } = initializeSheets();
  const data = graphsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === graphData.id) {
      const now = new Date().toISOString();
      graphsSheet.getRange(i + 1, 2, 1, 1).setValues([[graphData.name || data[i][1] || '']]);
      graphsSheet.getRange(i + 1, 5, 1, 1).setValues([[now]]);
      
      return ContentService.createTextOutput(JSON.stringify({
        id: graphData.id,
        name: graphData.name || data[i][1] || '',
        createdBy: data[i][2] || '',
        createdAt: data[i][3] || '',
        updatedAt: now
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Graph not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteGraph(id) {
  const { graphsSheet, tasksSheet, linksSheet, workflowsSheet } = initializeSheets();
  const graphData = graphsSheet.getDataRange().getValues();
  
  // Find and delete graph
  for (let i = 1; i < graphData.length; i++) {
    if (graphData[i][0] === id) {
      graphsSheet.deleteRow(i + 1);
      
      // Delete all tasks associated with this graph
      const taskData = tasksSheet.getDataRange().getValues();
      const taskHeaders = taskData[0];
      const graphIdIndex = taskHeaders.indexOf('graph_id');
      if (graphIdIndex !== -1) {
        for (let j = taskData.length - 1; j >= 1; j--) {
          if (taskData[j][graphIdIndex] === id) {
            tasksSheet.deleteRow(j + 1);
          }
        }
      }
      
      // Delete all links associated with this graph
      const linkData = linksSheet.getDataRange().getValues();
      const linkHeaders = linkData[0];
      const linkGraphIdIndex = linkHeaders.indexOf('graph_id');
      if (linkGraphIdIndex !== -1) {
        for (let j = linkData.length - 1; j >= 1; j--) {
          if (linkData[j][linkGraphIdIndex] === id) {
            linksSheet.deleteRow(j + 1);
          }
        }
      }
      
      // Delete all workflows associated with this graph
      const workflowData = workflowsSheet.getDataRange().getValues();
      const workflowHeaders = workflowData[0];
      const workflowGraphIdIndex = workflowHeaders.indexOf('graph_id');
      if (workflowGraphIdIndex !== -1) {
        for (let j = workflowData.length - 1; j >= 1; j--) {
          if (workflowData[j][workflowGraphIdIndex] === id) {
            workflowsSheet.deleteRow(j + 1);
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Graph not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Task CRUD operations
function getAllTasks(graphId) {
  const { tasksSheet } = initializeSheets();
  const data = tasksSheet.getDataRange().getValues();
  const headers = data[0];
  const tasks = [];
  const graphIdIndex = headers.indexOf('graph_id');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      // Filter by graph_id if provided
      if (graphId && graphIdIndex !== -1 && row[graphIdIndex] !== graphId) {
        continue;
      }
      
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
        graph_id: graphIdIndex !== -1 ? (row[graphIdIndex] || '') : '',
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
  const graphIdIndex = headers.indexOf('graph_id');
  
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
        graph_id: graphIdIndex !== -1 ? (data[i][graphIdIndex] || '') : '',
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
  const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
  
  // Build row array for all columns in order
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header === 'id') {
      row[i] = id;
    } else if (header === 'title') {
      row[i] = taskData.title || '';
    } else if (header === 'description') {
      row[i] = taskData.description || '';
    } else if (header === 'status') {
      row[i] = taskData.status || 'Pending';
    } else if (header === 'backgroundColor') {
      row[i] = taskData.backgroundColor || '#FFFFFF';
    } else if (header === 'foregroundColor') {
      row[i] = taskData.foregroundColor || '#000000';
    } else if (header === 'createdBy') {
      row[i] = taskData.createdBy || 'admin';
    } else if (header === 'createdAt') {
      row[i] = now;
    } else if (header === 'updatedAt') {
      row[i] = now;
    } else if (header === 'updatedBy') {
      row[i] = taskData.updatedBy || '';
    } else if (header === 'assignedTo') {
      row[i] = taskData.assignedTo || '';
    } else if (header === 'assignedBy') {
      row[i] = taskData.assignedBy || '';
    } else if (header === 'workflow_id') {
      row[i] = taskData.workflow_id || '';
    } else if (header === 'graph_id') {
      row[i] = taskData.graph_id || '';
    } else if (header === 'x') {
      row[i] = taskData.x !== undefined ? taskData.x : '';
    } else if (header === 'y') {
      row[i] = taskData.y !== undefined ? taskData.y : '';
    } else {
      row[i] = '';
    }
  }
  
  tasksSheet.appendRow(row);
  
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
      const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
      const numCols = headers.length;
      
      // Build update array for all columns from 2 onwards (skip id column)
      const updateValues = [];
      for (let col = 1; col < numCols; col++) {
        const header = headers[col];
        let value;
        
        if (header === 'title') {
          value = taskData.title !== undefined ? (taskData.title || '') : data[i][col];
        } else if (header === 'description') {
          value = taskData.description !== undefined ? (taskData.description || '') : data[i][col];
        } else if (header === 'status') {
          value = taskData.status !== undefined ? (taskData.status || 'Pending') : data[i][col];
        } else if (header === 'backgroundColor') {
          value = taskData.backgroundColor !== undefined ? (taskData.backgroundColor || '#FFFFFF') : data[i][col];
        } else if (header === 'foregroundColor') {
          value = taskData.foregroundColor !== undefined ? (taskData.foregroundColor || '#000000') : data[i][col];
        } else if (header === 'createdBy') {
          value = taskData.createdBy !== undefined ? (taskData.createdBy || 'admin') : data[i][col];
        } else if (header === 'createdAt') {
          value = data[i][col] || now; // Keep original
        } else if (header === 'updatedAt') {
          value = now;
        } else if (header === 'updatedBy') {
          value = taskData.updatedBy !== undefined ? (taskData.updatedBy || '') : (data[i][col] || '');
        } else if (header === 'assignedTo') {
          value = taskData.assignedTo !== undefined ? (taskData.assignedTo || '') : (data[i][col] || '');
        } else if (header === 'assignedBy') {
          value = taskData.assignedBy !== undefined ? (taskData.assignedBy || '') : (data[i][col] || '');
        } else if (header === 'workflow_id') {
          value = taskData.workflow_id !== undefined ? (taskData.workflow_id || '') : (data[i][col] || '');
        } else if (header === 'graph_id') {
          value = taskData.graph_id !== undefined ? (taskData.graph_id || '') : (data[i][col] || '');
        } else if (header === 'x') {
          value = taskData.x !== undefined && taskData.x !== null ? taskData.x : (data[i][col] !== undefined && data[i][col] !== '' ? data[i][col] : '');
        } else if (header === 'y') {
          value = taskData.y !== undefined && taskData.y !== null ? taskData.y : (data[i][col] !== undefined && data[i][col] !== '' ? data[i][col] : '');
        } else {
          value = data[i][col] || '';
        }
        
        updateValues.push(value);
      }
      
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
function getAllLinks(graphId) {
  const { linksSheet } = initializeSheets();
  const data = linksSheet.getDataRange().getValues();
  const headers = data[0];
  const links = [];
  const graphIdIndex = headers.indexOf('graph_id');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      // Filter by graph_id if provided
      if (graphId && graphIdIndex !== -1 && row[graphIdIndex] !== graphId) {
        continue;
      }
      
      links.push({
        id: row[0],
        source: row[1],
        target: row[2],
        graph_id: graphIdIndex !== -1 ? (row[graphIdIndex] || '') : ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(links))
    .setMimeType(ContentService.MimeType.JSON);
}

function createLink(linkData) {
  const { linksSheet } = initializeSheets();
  const id = Utilities.getUuid();
  const headers = linksSheet.getRange(1, 1, 1, linksSheet.getLastColumn()).getValues()[0];
  
  // Build row array for all columns in order
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header === 'id') {
      row[i] = id;
    } else if (header === 'source') {
      row[i] = linkData.source || '';
    } else if (header === 'target') {
      row[i] = linkData.target || '';
    } else if (header === 'graph_id') {
      row[i] = linkData.graph_id || '';
    } else {
      row[i] = '';
    }
  }
  
  linksSheet.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    source: linkData.source,
    target: linkData.target,
    graph_id: linkData.graph_id || ''
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
function getAllWorkflows(graphId) {
  const { workflowsSheet } = initializeSheets();
  const data = workflowsSheet.getDataRange().getValues();
  const headers = data[0];
  const workflows = [];
  const graphIdIndex = headers.indexOf('graph_id');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Check if id exists
      // Filter by graph_id if provided
      if (graphId && graphIdIndex !== -1 && row[graphIdIndex] !== graphId) {
        continue;
      }
      
      workflows.push({
        id: row[0],
        label: row[1] || '',
        graph_id: graphIdIndex !== -1 ? (row[graphIdIndex] || '') : ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(workflows))
    .setMimeType(ContentService.MimeType.JSON);
}

function createWorkflow(workflowData) {
  const { workflowsSheet } = initializeSheets();
  const id = Utilities.getUuid();
  const headers = workflowsSheet.getRange(1, 1, 1, workflowsSheet.getLastColumn()).getValues()[0];
  
  // Build row array for all columns in order
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header === 'id') {
      row[i] = id;
    } else if (header === 'label') {
      row[i] = workflowData.label || '';
    } else if (header === 'graph_id') {
      row[i] = workflowData.graph_id || '';
    } else {
      row[i] = '';
    }
  }
  
  workflowsSheet.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({
    id,
    label: workflowData.label || '',
    graph_id: workflowData.graph_id || ''
  })).setMimeType(ContentService.MimeType.JSON);
}

