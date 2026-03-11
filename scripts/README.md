# Migration Scripts

This directory contains database migration scripts for the Pledge Tracker application.

## Multi-Project Support Migration

### Overview

The `migrate-to-multi-project.ts` script migrates existing pledge tracker data to support multi-project functionality. This is a critical migration for backward compatibility when introducing the multi-project feature.

### What It Does

1. **Creates Default Project**: Creates a "Legacy Project" with:
   - Name: "Legacy Project"
   - Status: active
   - Start date: Current date
   - Initial totals: 0

2. **Associates Existing Pledges**: Finds all pledges without a `project_id` and associates them with the default project

3. **Calculates Project Totals**: Computes and updates:
   - `total_promised_amount`: Sum of all pledge amounts
   - `total_collected_amount`: Sum of all payments

4. **Creates User Assignments**: Creates `ProjectAssignment` records for all active users (admins and follow-up users) to the default project

### Prerequisites

- Node.js and npm installed
- Database connection configured in `.env` file
- Required environment variables:
  - `DB_URL` (or `MONGO_DB_HOST` and `DB_NAME`)
  - Optional: `MONGO_USERNAME` and `MONGO_PASSWORD` for authenticated connections

### Usage

#### Running the Migration

```bash
# Using npm script (recommended)
npm run migrate:multi-project

# Or directly with ts-node
npx ts-node scripts/migrate-to-multi-project.ts
```

#### Rolling Back the Migration

```bash
# Using npm script (recommended)
npm run migrate:rollback

# Or directly with ts-node
npx ts-node scripts/migrate-to-multi-project.ts rollback
```

### Idempotency

The migration script is **idempotent**, meaning it's safe to run multiple times:

- If the default project already exists, it will be reused
- If pledges already have project associations, they won't be modified
- If project assignments already exist, they won't be duplicated
- Running the script multiple times will not create duplicate data

### Rollback

The rollback functionality will:

1. Remove all project assignments for the default project
2. Remove the `project_id` field from all pledges associated with the default project
3. Delete the default "Legacy Project"

**Warning**: Only rollback if you're certain you want to undo the migration. This will remove the multi-project structure from your database.

### Output

The script provides detailed console output showing:

- Connection status
- Each step of the migration process
- Number of records affected
- Summary of changes made
- Any errors encountered

Example output:

```
===========================================
  Multi-Project Support Migration
===========================================

Connecting to database...
✓ Connected to database

--- Step 1: Creating Default Project ---
✓ Created default project "Legacy Project" (ID: 507f1f77bcf86cd799439011)

--- Step 2: Associating Pledges with Default Project ---
Found 150 pledges without project association
✓ Associated 150 pledges with default project

--- Step 3: Calculating Project Totals ---
✓ Updated project totals:
  - Total Promised: 5000000
  - Total Collected: 2500000
  - Pledges Count: 150

--- Step 4: Creating Project Assignments ---
Found 5 active users to assign to default project
✓ Created 5 project assignments

===========================================
  Migration Completed Successfully! ✓
===========================================

Summary:
  - Default Project ID: 507f1f77bcf86cd799439011
  - Pledges Updated: 150
  - Assignments Created: 5

✓ Disconnected from database
```

### Troubleshooting

#### Connection Issues

If you encounter database connection errors:

1. Verify your `.env` file has the correct database configuration
2. Ensure MongoDB is running
3. Check network connectivity to the database server
4. Verify authentication credentials if using authenticated connections

#### Migration Fails Midway

The script is designed to be safe to re-run. If it fails:

1. Check the error message for specific issues
2. Fix the underlying problem (e.g., database permissions, network issues)
3. Re-run the migration script
4. The script will skip already-migrated data and continue from where it left off

#### Rollback Issues

If rollback fails:

1. Check that the default project exists in the database
2. Verify you have write permissions to the database
3. Review the error message for specific issues
4. You may need to manually clean up partial rollback data

### Testing

Before running in production:

1. **Backup your database** - Always create a backup before running migrations
2. **Test in development** - Run the migration on a development/staging environment first
3. **Verify results** - Check that:
   - Default project was created
   - All pledges have project associations
   - Project totals are correct
   - All users have project assignments
4. **Test rollback** - Verify the rollback works correctly in your test environment

### Support

For issues or questions about this migration:

1. Check the console output for detailed error messages
2. Review the script source code in `scripts/migrate-to-multi-project.ts`
3. Consult the multi-project support specification in `.kiro/specs/multi-project-support/`
