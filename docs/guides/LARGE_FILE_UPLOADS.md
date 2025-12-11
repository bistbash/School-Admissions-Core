# Large File Uploads

Guide for uploading large files with many students.

---

## File Size Limits

| User Type | Max File Size | Uploads/Hour | Max Students |
|-----------|---------------|--------------|--------------|
| Regular   | 10MB          | 5            | ~1,000       |
| Trusted   | 200MB         | 100          | ~20,000      |
| Admin     | 500MB         | 1000         | ~50,000+     |

---

## Performance

- Files processed in batches (50-100 rows per batch)
- Progress logged every 100 rows
- Large files (50,000+ students) may take 10-30 minutes

---

## Best Practices

1. **Split large files**: If >20,000 students, split into smaller files
2. **Optimize Excel**: Remove unnecessary columns, ensure correct format
3. **Monitor progress**: Check console logs for progress updates
4. **Handle errors**: Check `errors` array in response

---

## Getting Trusted User Status

Request admin to add you to trusted users for:
- 200MB max file size (instead of 10MB)
- 100 uploads/hour (instead of 5)
- Higher rate limits

---

## Response Format

```json
{
  "message": "File processed successfully",
  "summary": {
    "totalRows": 2000,
    "created": 1500,
    "updated": 500,
    "errors": 0
  },
  "errors": []
}
```
