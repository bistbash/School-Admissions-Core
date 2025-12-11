# מדריך יצירת דפים חדשים במערכת

מדריך זה מסביר איך ליצור דף חדש במערכת בצורה מסודרת וקלה.

## כלי יצירת דפים

המערכת כוללת כלי CLI שיוצר אוטומטית את כל הקבצים הנדרשים לדף חדש.

### שימוש בסיסי

```bash
cd backend
npm run create-page
```

הכלי יבקש ממך את כל הפרטים הנדרשים:
- שם הדף (באנגלית)
- שם תצוגה (עברית ואנגלית)
- תיאור
- קטגוריה
- האם תומך במצב עריכה
- API endpoints לצפייה
- API endpoints לעריכה
- מצבי צפייה מותאמים אישית (אופציונלי)

### מה הכלי יוצר?

1. **עדכון permission-registry.ts** - מוסיף את ההגדרות של הדף
2. **יצירת קובץ React** - יוצר את קומפוננטת הדף ב-frontend
3. **יצירת תיעוד** - יוצר קובץ markdown עם כל הפרטים

## שלבים נוספים לאחר יצירת הדף

לאחר שהכלי יוצר את הדף, יש לבצע את השלבים הבאים:

### 1. הוספת Route ב-Frontend

הוסף את הדף ל-router שלך (בדרך כלל ב-`App.tsx` או קובץ routing):

```tsx
import { ${ComponentName} } from './features/${page-name}/${ComponentName}';

// ב-routes:
<Route path="${page-name}" element={<${ComponentName} />} />
```

### 2. הוספה ל-Sidebar Navigation

הוסף את הדף ל-sidebar navigation כך שמשתמשים יוכלו לגשת אליו.

### 3. יצירת API Endpoints (אם נדרש)

אם ה-API endpoints שציינת לא קיימים, צור אותם ב-backend:
- Controller
- Service
- Routes

### 4. בדיקת הרשאות

ודא שההרשאות עובדות:
- בדוק שהדף מופיע ב-permission manager
- בדוק שצפייה ועריכה עובדות
- בדוק מצבי צפייה מותאמים אישית (אם הוגדרו)

## דוגמה: יצירת דף "ניהול ציוד"

```bash
npm run create-page
```

תשובות לדוגמה:
- שם הדף: `equipment`
- שם תצוגה: `Equipment`
- שם תצוגה בעברית: `ניהול ציוד`
- תיאור: `Manage school equipment`
- תיאור בעברית: `ניהול ציוד בית ספר`
- קטגוריה: `2` (אקדמי)
- תומך במצב עריכה: `y`
- View APIs:
  - Resource: `equipment`, Action: `read`, Method: `GET`, Path: `/api/equipment`
- Edit APIs:
  - Resource: `equipment`, Action: `create`, Method: `POST`, Path: `/api/equipment`
  - Resource: `equipment`, Action: `update`, Method: `PUT`, Path: `/api/equipment/:id`
  - Resource: `equipment`, Action: `delete`, Method: `DELETE`, Path: `/api/equipment/:id`

## מצבי צפייה מותאמים אישית

אם הדף צריך מצבי צפייה שונים (למשל: מורה רואה דברים שונים ממנהל), תוכל להגדיר אותם:

### דוגמה: דף תלמידים עם מצבי צפייה

- **מורה**: רואה רק את התלמידים שלה
- **יועצת**: רואה את כל התלמידים + מידע נוסף
- **מנהל**: רואה הכל + יכול לערוך

כל מצב יכול להגדיר APIs משלו ב-`viewAPIs` ו-`editAPIs`.

## מבנה Permission Registry

כל דף ב-`permission-registry.ts` מכיל:

```typescript
'page-name': {
  page: 'page-name',
  displayName: 'Display Name',
  displayNameHebrew: 'שם תצוגה',
  description: 'Description',
  descriptionHebrew: 'תיאור',
  detailedExplanation: 'הסבר מפורט...',
  category: 'academic' | 'general' | 'administration' | 'security',
  categoryHebrew: 'אקדמי' | 'כללי' | 'ניהול' | 'אבטחה',
  viewAPIs: [...], // APIs לצפייה
  editAPIs: [...], // APIs לעריכה
  supportsEditMode: true | false,
  customModes: [...] // מצבי צפייה מותאמים אישית (אופציונלי)
}
```

## טיפים

1. **שמות עקביים**: השתמש בשמות עקביים לדפים (lowercase עם מקפים)
2. **תיאורים ברורים**: כתוב תיאורים ברורים בעברית ובאנגלית
3. **APIs רלוונטיים**: הוסף רק APIs שהדף באמת צריך
4. **מצבי צפייה**: השתמש במצבי צפייה מותאמים אישית רק כשצריך
5. **תיעוד**: עדכן את התיעוד כשמוסיפים תכונות חדשות

## פתרון בעיות

### הדף לא מופיע ב-permission manager
- ודא שהוספת אותו ל-`permission-registry.ts`
- ודא שהשם נכון (lowercase עם מקפים)
- רענן את הדף

### הרשאות לא עובדות
- בדוק שה-API endpoints קיימים
- בדוק שה-permissions נוצרו ב-database
- בדוק את ה-logs ב-backend

### מצבי צפייה לא עובדים
- ודא שהוגדרו ב-`customModes`
- ודא שה-APIs שלהם מוגדרים נכון
- בדוק שה-permissions ניתנו למשתמש/תפקיד
