# Large File Uploads - Guide

## Overview

המערכת תומכת בהעלאת קבצים גדולים עם מספר תלמידים רב. המגבלות והביצועים משתנים לפי סוג המשתמש.

## File Size Limits

### Regular Users (משתמשים רגילים)
- **Max File Size**: 10MB
- **Rate Limit**: 5 uploads per hour
- **Recommended**: עד 500-1000 תלמידים לקובץ

### Trusted Users (משתמשים מהימנים)
- **Max File Size**: 200MB
- **Rate Limit**: 100 uploads per hour
- **Recommended**: עד 10,000-20,000 תלמידים לקובץ

### Admin Users (מנהלים)
- **Max File Size**: 500MB
- **Rate Limit**: 1000 uploads per hour (effectively unlimited)
- **Recommended**: עד 50,000+ תלמידים לקובץ

## Performance Optimizations

### Batch Processing
המערכת מעבדת קבצים גדולים בקבוצות (batches) לשיפור ביצועים:
- **קבצים קטנים (<1000 שורות)**: batch size של 100
- **קבצים גדולים (>1000 שורות)**: batch size של 50

### Progress Logging
לקבצים גדולים, המערכת מדפיסה התקדמות כל 100 שורות:
```
Processing: 500/2000 rows (25%)
Processing: 1000/2000 rows (50%)
Processing: 2000/2000 rows (100%)
```

## Best Practices

### 1. Split Large Files
אם יש לך קובץ עם יותר מ-20,000 תלמידים:
- **Option A**: חלק את הקובץ למספר קבצים קטנים יותר
- **Option B**: בקש להוסיף אותך ל-Trusted Users whitelist
- **Option C**: אם אתה admin, תוכל להעלות קבצים עד 500MB

### 2. Optimize Excel Files
- הסר עמודות מיותרות
- ודא שהפורמט נכון (Excel .xlsx מומלץ)
- ודא שאין שורות ריקות מיותרות

### 3. Monitor Progress
- בדוק את ה-console logs לראות התקדמות
- בדוק את ה-response לקבלת סיכום:
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

### 4. Handle Errors
אם יש שגיאות:
- בדוק את ה-`errors` array בתגובה
- כל שגיאה כוללת מספר שורה והודעת שגיאה
- תוכל לתקן את השורות הבעייתיות ולהעלות שוב

## Example: Uploading 10,000 Students

### As Regular User (לא מומלץ)
- צריך לפצל ל-10-20 קבצים של 500-1000 תלמידים כל אחד
- יקח זמן רב (5 uploads/hour)

### As Trusted User (מומלץ)
```bash
# 1. בקש מה-admin להוסיף אותך ל-Trusted Users
POST /api/soc/trusted-users
{
  "userId": 2,
  "email": "your-email@example.com",
  "name": "Your Name",
  "reason": "Need to upload large student files"
}

# 2. העלה את הקובץ (עד 200MB)
POST /api/students/upload
Content-Type: multipart/form-data
file: students_10000.xlsx
```

### As Admin (הכי קל)
```bash
# פשוט העלה את הקובץ (עד 500MB)
POST /api/students/upload
Content-Type: multipart/form-data
file: students_50000.xlsx
```

## Troubleshooting

### "File size exceeds limit"
- **Regular users**: הקטן את הקובץ או בקש להיכנס ל-Trusted Users
- **Trusted users**: הקטן את הקובץ או בקש admin privileges

### "Too many file uploads"
- חכה שעה בין העלאות
- בקש להיכנס ל-Trusted Users לקבלת יותר העלאות

### Processing Takes Too Long
- זה נורמלי לקבצים גדולים
- בדוק את ה-console logs לראות התקדמות
- קבצים גדולים מאוד (50,000+ תלמידים) יכולים לקחת 10-30 דקות

### Memory Issues
- אם יש בעיות זיכרון, חלק את הקובץ
- המערכת משתמשת ב-batch processing כדי למזער שימוש בזיכרון

## Technical Details

### Batch Processing
```typescript
// קבצים קטנים: batch size 100
// קבצים גדולים: batch size 50
const batchSize = rows.length > 1000 ? 50 : 100;
await processExcelData(rows, batchSize);
```

### File Size Check
```typescript
// Admin: 500MB
// Trusted: 200MB  
// Regular: 10MB
const maxFileSize = isAdmin ? 500MB : (isTrusted ? 200MB : 10MB);
```

### Rate Limiting
```typescript
// Admin: 1000/hour (effectively unlimited)
// Trusted: 100/hour
// Regular: 5/hour
```

## Recommendations

1. **להעלאות קטנות (<1000 תלמידים)**: Regular user מספיק
2. **להעלאות בינוניות (1000-10,000)**: בקש Trusted User status
3. **להעלאות גדולות (>10,000)**: Admin או חלק את הקובץ
4. **להעלאות תכופות**: בקש Trusted User status

## Getting Trusted User Status

אם אתה צריך להעלות קבצים גדולים:
1. בקש מה-admin להוסיף אותך ל-Trusted Users
2. Admin יכול להוסיף דרך: `POST /api/soc/trusted-users`
3. אחרי הוספה, תקבל:
   - 200MB max file size (במקום 10MB)
   - 100 uploads/hour (במקום 5)
   - Higher rate limits בכלל

## Summary

| User Type | Max File Size | Uploads/Hour | Max Students/File |
|-----------|---------------|-------------|------------------|
| Regular   | 10MB          | 5           | ~1,000           |
| Trusted   | 200MB         | 100         | ~20,000          |
| Admin     | 500MB         | 1000        | ~50,000+         |
