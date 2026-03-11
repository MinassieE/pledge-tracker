/**
 * Migration Script: Multi-Project Support
 * 
 * This script migrates existing pledge tracker data to support multi-project functionality.
 * It creates a default "Legacy Project" and associates all existing pledges and users with it.
 * 
 * Features:
 * - Creates a default "Legacy Project" with status 'active'
 * - Associates all existing pledges with the default project
 * - Calculates and updates project totals from pledges
 * - Creates ProjectAssignment records for all existing users
 * - Provides rollback capability to undo changes
 * - Idempotent: Safe to run multiple times
 * 
 * Usage:
 *   npm run migrate:multi-project        # Run migration
 *   npm run migrate:multi-project rollback  # Rollback migration
 * 
 * Environment Variables:
 *   DB_URL or MONGO_DB_HOST, DB_NAME - Database connection
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Project, IProject } from '../src/modules/project';
import { Pledge } from '../src/modules/pledge';
import { Admin } from '../src/modules/admin';
import { ProjectAssignment } from '../src/modules/projectAssignment';

dotenv.config();

// Configuration
const DEFAULT_PROJECT_NAME = 'Legacy Project';
const DEFAULT_PROJECT_DESCRIPTION = 'Default project for existing pledges migrated to multi-project support';

// Database connection
const getDbUrl = (): string => {
  if (process.env.DB_URL) {
    return process.env.DB_URL;
  }
  
  const host = process.env.MONGO_DB_HOST || 'localhost';
  const dbName = process.env.DB_NAME || 'NCIC_PLEDGE';
  
  if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
    return `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${host}/${dbName}`;
  }
  
  return `mongodb://${host}/${dbName}`;
};

/**
 * Connect to MongoDB
 */
async function connectToDatabase(): Promise<void> {
  const dbUrl = getDbUrl();
  console.log('Connecting to database...');
  
  try {
    await mongoose.connect(dbUrl);
    console.log('✓ Connected to database');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('✓ Disconnected from database');
}

/**
 * Find or create the default "Legacy Project"
 */
async function findOrCreateDefaultProject(): Promise<mongoose.Types.ObjectId> {
  console.log('\n--- Step 1: Creating Default Project ---');
  
  // Check if default project already exists
  let project = await Project.findOne({ name: DEFAULT_PROJECT_NAME });
  
  if (project) {
    console.log(`✓ Default project "${DEFAULT_PROJECT_NAME}" already exists (ID: ${project._id})`);
    return project._id as mongoose.Types.ObjectId;
  }
  
  // Create new default project
  project = await Project.create({
    name: DEFAULT_PROJECT_NAME,
    description: DEFAULT_PROJECT_DESCRIPTION,
    start_date: new Date(),
    status: 'active',
    total_promised_amount: 0,
    total_collected_amount: 0
  });
  
  console.log(`✓ Created default project "${DEFAULT_PROJECT_NAME}" (ID: ${project._id})`);
  return project._id as mongoose.Types.ObjectId;
}

/**
 * Associate all existing pledges without project_id to the default project
 */
async function associatePledgesWithProject(projectId: mongoose.Types.ObjectId): Promise<number> {
  console.log('\n--- Step 2: Associating Pledges with Default Project ---');
  
  // Find pledges without project_id
  const pledgesWithoutProject = await Pledge.countDocuments({ 
    $or: [
      { project_id: { $exists: false } },
      { project_id: null }
    ]
  });
  
  if (pledgesWithoutProject === 0) {
    console.log('✓ All pledges already have project associations');
    return 0;
  }
  
  console.log(`Found ${pledgesWithoutProject} pledges without project association`);
  
  // Update pledges to reference the default project
  const result = await Pledge.updateMany(
    { 
      $or: [
        { project_id: { $exists: false } },
        { project_id: null }
      ]
    },
    { $set: { project_id: projectId } }
  );
  
  console.log(`✓ Associated ${result.modifiedCount} pledges with default project`);
  return result.modifiedCount;
}

/**
 * Calculate and update project totals from pledges
 */
async function calculateProjectTotals(projectId: mongoose.Types.ObjectId): Promise<void> {
  console.log('\n--- Step 3: Calculating Project Totals ---');
  
  // Get all pledges for this project
  const pledges = await Pledge.find({ project_id: projectId });
  
  if (pledges.length === 0) {
    console.log('✓ No pledges found for project, totals remain at 0');
    return;
  }
  
  // Calculate totals
  const totalPromised = pledges.reduce((sum, pledge) => sum + (pledge.promised_amount || 0), 0);
  const totalCollected = pledges.reduce((sum, pledge) => sum + (pledge.amount_paid || 0), 0);
  
  // Update project with calculated totals
  await Project.findByIdAndUpdate(projectId, {
    total_promised_amount: totalPromised,
    total_collected_amount: totalCollected
  });
  
  console.log(`✓ Updated project totals:`);
  console.log(`  - Total Promised: ${totalPromised}`);
  console.log(`  - Total Collected: ${totalCollected}`);
  console.log(`  - Pledges Count: ${pledges.length}`);
}

/**
 * Create project assignments for all existing users
 */
async function createProjectAssignments(projectId: mongoose.Types.ObjectId): Promise<number> {
  console.log('\n--- Step 4: Creating Project Assignments ---');
  
  // Get all active users (admins and follow-up users)
  const users = await Admin.find({ status: 'active' });
  
  if (users.length === 0) {
    console.log('✓ No active users found to assign');
    return 0;
  }
  
  console.log(`Found ${users.length} active users to assign to default project`);
  
  // Find a super admin to use as the "assigned_by" user
  let superAdmin = await Admin.findOne({ role: 'superAdmin', status: 'active' });
  
  if (!superAdmin) {
    // If no super admin exists, use the first admin
    superAdmin = users[0];
    console.log(`⚠ No super admin found, using user ${superAdmin._id} as assigner`);
  }
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  // Create assignments for each user
  for (const user of users) {
    try {
      // Check if assignment already exists
      const existingAssignment = await ProjectAssignment.findOne({
        user_id: user._id,
        project_id: projectId
      });
      
      if (existingAssignment) {
        skippedCount++;
        continue;
      }
      
      // Create new assignment
      await ProjectAssignment.create({
        user_id: user._id,
        project_id: projectId,
        assigned_at: new Date(),
        assigned_by: superAdmin._id
      });
      
      assignedCount++;
    } catch (error) {
      console.error(`✗ Failed to assign user ${user._id}:`, error);
    }
  }
  
  console.log(`✓ Created ${assignedCount} project assignments`);
  if (skippedCount > 0) {
    console.log(`  (Skipped ${skippedCount} existing assignments)`);
  }
  
  return assignedCount;
}

/**
 * Run the migration
 */
async function migrate(): Promise<void> {
  console.log('===========================================');
  console.log('  Multi-Project Support Migration');
  console.log('===========================================\n');
  
  try {
    await connectToDatabase();
    
    // Step 1: Create default project
    const projectId = await findOrCreateDefaultProject();
    
    // Step 2: Associate pledges with project
    const pledgesUpdated = await associatePledgesWithProject(projectId);
    
    // Step 3: Calculate project totals
    await calculateProjectTotals(projectId);
    
    // Step 4: Create project assignments
    const assignmentsCreated = await createProjectAssignments(projectId);
    
    console.log('\n===========================================');
    console.log('  Migration Completed Successfully! ✓');
    console.log('===========================================');
    console.log(`\nSummary:`);
    console.log(`  - Default Project ID: ${projectId}`);
    console.log(`  - Pledges Updated: ${pledgesUpdated}`);
    console.log(`  - Assignments Created: ${assignmentsCreated}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * Rollback the migration
 */
async function rollback(): Promise<void> {
  console.log('===========================================');
  console.log('  Multi-Project Support Rollback');
  console.log('===========================================\n');
  
  try {
    await connectToDatabase();
    
    // Find the default project
    const project = await Project.findOne({ name: DEFAULT_PROJECT_NAME });
    
    if (!project) {
      console.log('✓ Default project not found, nothing to rollback');
      return;
    }
    
    console.log(`Found default project (ID: ${project._id})`);
    
    // Step 1: Remove project assignments for this project
    console.log('\n--- Step 1: Removing Project Assignments ---');
    const assignmentsResult = await ProjectAssignment.deleteMany({ 
      project_id: project._id 
    });
    console.log(`✓ Removed ${assignmentsResult.deletedCount} project assignments`);
    
    // Step 2: Remove project_id from pledges
    console.log('\n--- Step 2: Removing Project References from Pledges ---');
    const pledgesResult = await Pledge.updateMany(
      { project_id: project._id },
      { $unset: { project_id: "" } }
    );
    console.log(`✓ Removed project reference from ${pledgesResult.modifiedCount} pledges`);
    
    // Step 3: Delete the default project
    console.log('\n--- Step 3: Deleting Default Project ---');
    await Project.findByIdAndDelete(project._id);
    console.log(`✓ Deleted default project "${DEFAULT_PROJECT_NAME}"`);
    
    console.log('\n===========================================');
    console.log('  Rollback Completed Successfully! ✓');
    console.log('===========================================\n');
    
  } catch (error) {
    console.error('\n✗ Rollback failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'rollback') {
    await rollback();
  } else {
    await migrate();
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { migrate, rollback };
