# Frontend - מערכת בית ספר

Frontend מודרני ומעוצב למערכת בית ספר עם תמיכה ב-Light/Dark theme בסגנון Vercel.

## תכונות

- ✨ עיצוב מודרני ומקצועי בסגנון Vercel
- 🌓 Light/Dark theme עם מעבר חלק
- 📱 Responsive design - מותאם למובייל
- 🔐 מערכת אימות מלאה
- 👥 ניהול משתמשים (למנהלים)
- 📊 Dashboard עם סטטיסטיקות

## טכנולוגיות

- **React 19** - ספריית UI
- **TypeScript** - Type safety
- **Vite** - Build tool מהיר
- **Tailwind CSS** - Styling
- **React Router** - ניתוב
- **Lucide React** - אייקונים
- **Radix UI** - UI components נגישים

## התקנה והרצה

```bash
# התקנת dependencies
npm install

# הרצה בסביבת פיתוח
npm run dev

# Build לייצור
npm run build

# Preview של build
npm run preview
```

## מבנה הפרויקט

```
src/
├── components/        # קומפוננטים משותפים
│   ├── ui/           # UI components (Button, Card, Input, etc.)
│   └── layout/       # Layout components
├── contexts/         # React contexts (Theme, Auth)
├── pages/            # דפי האפליקציה
├── lib/              # Utilities ו-API clients
└── types/            # TypeScript types
```

## נושאים (Themes)

המערכת תומכת ב-3 מצבי נושא:
- **Light** - נושא בהיר
- **Dark** - נושא כהה
- **System** - עוקב אחר הגדרות המערכת

הנושא נשמר ב-localStorage ומתעדכן אוטומטית.

## API

המערכת מתחברת ל-backend דרך:
- `VITE_API_URL` - כתובת ה-API (ברירת מחדל: `http://localhost:3000/api`)

 הגדר את המשתנה ב-`.env`:
```
VITE_API_URL=http://localhost:3000/api
```
