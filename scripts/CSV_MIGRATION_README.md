# TSV to Firestore Migration (Simple Method)

This is the **easiest way** to migrate your data if you have a small amount of data.

## Quick Steps

1. **Export your Google Sheets as TSV**
   - Open each sheet (Graphs, Tasks, Workflows, Links)
   - File → Download → Tab-separated values (.tsv)
   - Save each file with these exact names:
     - `Graphs.tsv`
     - `Tasks.tsv`
     - `Workflows.tsv`
     - `Links.tsv`

2. **Create the data directory**
   ```bash
   mkdir -p scripts/tsv-data
   ```

3. **Place TSV files in the directory**
   - Copy all 4 TSV files into `scripts/tsv-data/`

4. **Run the migration**
   ```bash
   npm run migrate-csv
   ```

That's it! 🎉

## TSV File Format

Your TSV files should have:
- **First row**: Headers (column names, tab-separated)
- **Subsequent rows**: Data (tab-separated)

Example `Graphs.tsv`:
```
id	name	createdBy	createdAt	updatedAt
graph-1	My Graph	user@example.com	2024-01-01T00:00:00Z	2024-01-01T00:00:00Z
graph-2	Another Graph	user@example.com	2024-01-02T00:00:00Z	2024-01-02T00:00:00Z
```

## What Gets Migrated

- ✅ All graphs with preserved IDs and timestamps
- ✅ All workflows linked to graphs
- ✅ All tasks with all fields (including x, y coordinates)
- ✅ All links between tasks

## Notes

- **Duplicate Prevention**: The script skips records that already exist in Firestore
- **ID Preservation**: Original IDs from Google Sheets are preserved
- **Timestamps**: Original timestamps are preserved if present in CSV
- **Missing Files**: If a CSV file is missing, that collection is skipped

## Troubleshooting

### "Cannot find module" error
Make sure you've installed dependencies:
```bash
npm install
```

### "TSV file not found" error
- Make sure TSV files are in `scripts/tsv-data/` directory
- Check that file names match exactly: `Graphs.tsv`, `Tasks.tsv`, `Workflows.tsv`, `Links.tsv`
- File names are case-sensitive!

### Firebase connection errors
- Verify all Firebase environment variables are set in `.env.local`
- Make sure Firestore is enabled in your Firebase project

### TSV parsing errors
- Make sure your TSV files use tabs as separators (not commas or spaces)
- Check that the first row contains headers
- Ensure all rows have the same number of columns
- If exporting from Google Sheets, make sure to select "Tab-separated values" format

## Alternative: Manual Entry

If you have **very few records** (like 5-10), you can also manually add them through the Firestore Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database
4. Create collections: `graphs`, `tasks`, `workflows`, `links`
5. Add documents manually

But for anything more than a handful of records, the CSV migration script is much faster!

