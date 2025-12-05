/**
 * Simple TSV to Firestore Migration Script
 * 
 * Usage:
 * 1. Export your Google Sheets as TSV files:
 *    - File → Download → Tab-separated values (.tsv)
 *    - Save as: Graphs.tsv, Tasks.tsv, Workflows.tsv, Links.tsv
 * 2. Place TSV files in the scripts/tsv-data/ directory
 * 3. Run: npm run migrate-csv
 * 
 * TSV File Requirements:
 * - First row must be headers (column names)
 * - Files must be named: Graphs.tsv, Tasks.tsv, Workflows.tsv, Links.tsv
 * - Place them in: scripts/tsv-data/
 */

// Load environment variables FIRST, before any Firebase imports
import dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });
// Also try .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify Firebase config is loaded
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('❌ Error: Firebase environment variables not found!');
  console.error('   Make sure .env.local exists in the project root with:');
  console.error('   - NEXT_PUBLIC_FIREBASE_API_KEY');
  console.error('   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.error('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.error('   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  console.error('   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  console.error('   - NEXT_PUBLIC_FIREBASE_APP_ID');
  process.exit(1);
}

// Now import Firebase after env vars are loaded
import * as fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { Task, Graph, Workflow, TaskLink } from '../lib/types';

// Initialize Firebase directly in the script
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TSV_DIR = path.join(process.cwd(), 'scripts', 'tsv-data');

interface MigrationStats {
  graphs: { success: number; errors: number };
  tasks: { success: number; errors: number };
  workflows: { success: number; errors: number };
  links: { success: number; errors: number };
}

function parseTSV(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  // Parse headers (tab-separated)
  const headers = lines[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse data rows (tab-separated)
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      row[header] = value === '' || value === undefined ? undefined : value;
    });
    
    // Only include rows that have an ID
    if (row.id) {
      data.push(row);
    }
  }
  
  return data;
}

async function migrateGraphs(stats: MigrationStats) {
  console.log('\n📊 Migrating Graphs...');
  const tsvPath = path.join(TSV_DIR, 'Graphs.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.log(`  ⚠️  Graphs.tsv not found at ${tsvPath}, skipping...`);
    return;
  }

  const graphsData = parseTSV(tsvPath);

  for (const graphData of graphsData) {
    try {
      // Check if graph already exists
      const graphRef = doc(db, 'graphs', graphData.id);
      try {
        const existing = await getDoc(graphRef);
        if (existing.exists()) {
          console.log(`  ⏭️  Graph ${graphData.id} already exists, skipping...`);
          continue;
        }
      } catch {
        // Graph doesn't exist, continue with creation
      }

      const graphDataToSave: any = {
        name: graphData.name || '',
        createdBy: graphData.createdBy || 'migration',
        createdAt: graphData.createdAt || new Date().toISOString(),
        updatedAt: graphData.updatedAt || new Date().toISOString(),
      };
      
      await setDoc(graphRef, graphDataToSave);
      console.log(`  ✅ Migrated graph: ${graphData.id} (${graphDataToSave.name})`);
      stats.graphs.success++;
    } catch (error) {
      console.error(`  ❌ Error migrating graph ${graphData.id}:`, error);
      stats.graphs.errors++;
    }
  }
}

async function migrateWorkflows(stats: MigrationStats) {
  console.log('\n🔄 Migrating Workflows...');
  const tsvPath = path.join(TSV_DIR, 'Workflows.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.log(`  ⚠️  Workflows.tsv not found at ${tsvPath}, skipping...`);
    return;
  }

  const workflowsData = parseTSV(tsvPath);

  for (const workflowData of workflowsData) {
    try {
      if (!workflowData.graph_id) {
        console.log(`  ⚠️  Workflow ${workflowData.id} missing graph_id, skipping...`);
        continue;
      }

      const workflow: Omit<Workflow, 'id'> = {
        label: workflowData.label || '',
        graph_id: workflowData.graph_id,
      };

      const workflowRef = doc(db, 'workflows', workflowData.id);
      await setDoc(workflowRef, workflow);
      console.log(`  ✅ Migrated workflow: ${workflowData.id} (${workflow.label})`);
      stats.workflows.success++;
    } catch (error) {
      console.error(`  ❌ Error migrating workflow ${workflowData.id}:`, error);
      stats.workflows.errors++;
    }
  }
}

async function migrateTasks(stats: MigrationStats) {
  console.log('\n📝 Migrating Tasks...');
  const tsvPath = path.join(TSV_DIR, 'Tasks.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.log(`  ⚠️  Tasks.tsv not found at ${tsvPath}, skipping...`);
    return;
  }

  const tasksData = parseTSV(tsvPath);

  for (const taskData of tasksData) {
    try {
      if (!taskData.graph_id) {
        console.log(`  ⚠️  Task ${taskData.id} missing graph_id, skipping...`);
        continue;
      }

      const taskToSave: any = {
        title: taskData.title || '',
        description: taskData.description || '',
        status: (taskData.status as Task['status']) || 'Pending',
        backgroundColor: taskData.backgroundColor || '#ffffff',
        foregroundColor: taskData.foregroundColor || '#000000',
        createdBy: taskData.createdBy || 'migration',
        createdAt: taskData.createdAt || new Date().toISOString(),
        updatedAt: taskData.updatedAt || new Date().toISOString(),
        graph_id: taskData.graph_id,
      };

      // Optional fields
      if (taskData.updatedBy) taskToSave.updatedBy = taskData.updatedBy;
      if (taskData.assignedTo) taskToSave.assignedTo = taskData.assignedTo;
      if (taskData.assignedBy) taskToSave.assignedBy = taskData.assignedBy;
      if (taskData.workflow_id) taskToSave.workflow_id = taskData.workflow_id;
      if (taskData.x !== undefined && taskData.x !== '') {
        taskToSave.x = typeof taskData.x === 'number' ? taskData.x : parseFloat(taskData.x);
      }
      if (taskData.y !== undefined && taskData.y !== '') {
        taskToSave.y = typeof taskData.y === 'number' ? taskData.y : parseFloat(taskData.y);
      }
      
      const taskRef = doc(db, 'tasks', taskData.id);
      await setDoc(taskRef, taskToSave);
      console.log(`  ✅ Migrated task: ${taskData.id} (${taskToSave.title})`);
      stats.tasks.success++;
    } catch (error) {
      console.error(`  ❌ Error migrating task ${taskData.id}:`, error);
      stats.tasks.errors++;
    }
  }
}

async function migrateLinks(stats: MigrationStats) {
  console.log('\n🔗 Migrating Links...');
  const tsvPath = path.join(TSV_DIR, 'Links.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.log(`  ⚠️  Links.tsv not found at ${tsvPath}, skipping...`);
    return;
  }

  const linksData = parseTSV(tsvPath);

  for (const linkData of linksData) {
    try {
      if (!linkData.source || !linkData.target || !linkData.graph_id) {
        console.log(`  ⚠️  Link ${linkData.id} missing required fields, skipping...`);
        continue;
      }

      const link: Omit<TaskLink, 'id'> = {
        source: linkData.source,
        target: linkData.target,
        graph_id: linkData.graph_id,
      };

      const linkRef = doc(db, 'links', linkData.id);
      await setDoc(linkRef, link);
      console.log(`  ✅ Migrated link: ${linkData.id} (${link.source} → ${link.target})`);
      stats.links.success++;
    } catch (error) {
      console.error(`  ❌ Error migrating link ${linkData.id}:`, error);
      stats.links.errors++;
    }
  }
}

async function main() {
  console.log('🚀 Starting TSV migration to Firestore...\n');

  // Create tsv-data directory if it doesn't exist
  if (!fs.existsSync(TSV_DIR)) {
    fs.mkdirSync(TSV_DIR, { recursive: true });
    console.log(`📁 Created directory: ${TSV_DIR}`);
    console.log('   Please place your TSV files (Graphs.tsv, Tasks.tsv, Workflows.tsv, Links.tsv) in this directory.\n');
    return;
  }

  const stats: MigrationStats = {
    graphs: { success: 0, errors: 0 },
    tasks: { success: 0, errors: 0 },
    workflows: { success: 0, errors: 0 },
    links: { success: 0, errors: 0 },
  };

  try {
    // Migrate in order: Graphs → Workflows → Tasks → Links
    await migrateGraphs(stats);
    await migrateWorkflows(stats);
    await migrateTasks(stats);
    await migrateLinks(stats);

    console.log('\n✨ Migration completed!');
    console.log('\n📊 Summary:');
    console.log(`  Graphs:   ${stats.graphs.success} migrated, ${stats.graphs.errors} errors`);
    console.log(`  Workflows: ${stats.workflows.success} migrated, ${stats.workflows.errors} errors`);
    console.log(`  Tasks:   ${stats.tasks.success} migrated, ${stats.tasks.errors} errors`);
    console.log(`  Links:   ${stats.links.success} migrated, ${stats.links.errors} errors`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);

