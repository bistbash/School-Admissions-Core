# Deployment Documentation

תיעוד פריסה למערכת School Admissions Core.

## 📁 Deployment Guides

### 🖥️ [Physical Server Deployment](./PHYSICAL_SERVER_DEPLOYMENT.md)
מדריך מקיף לפריסת המערכת על שרת פיזי עם Linux:
- הכנת השרת והתקנת תלויות
- מעבר מ-SQLite ל-PostgreSQL
- הגדרת PM2 לניהול תהליכים
- הגדרת Nginx כ-reverse proxy
- הגדרת SSL/TLS
- אסטרטגיית גיבויים
- ניטור ותחזוקה

## 🚀 Quick Start

לפריסה מהירה, עיין במדריך [Physical Server Deployment](./PHYSICAL_SERVER_DEPLOYMENT.md).

## 📋 Deployment Checklist

- [ ] שרת Linux מוכן עם גישה root/sudo
- [ ] Node.js 18+ מותקן
- [ ] PostgreSQL מותקן ומוגדר
- [ ] Nginx מותקן
- [ ] PM2 מותקן
- [ ] בסיס הנתונים הועבר מ-SQLite ל-PostgreSQL
- [ ] משתני סביבה מוגדרים
- [ ] האפליקציה בנויה ופועלת
- [ ] Nginx מוגדר כ-reverse proxy
- [ ] Firewall מוגדר
- [ ] גיבויים אוטומטיים מוגדרים
- [ ] SSL/TLS מוגדר (אופציונלי)


