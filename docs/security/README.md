# Security Documentation

תיעוד מקיף של אמצעי האבטחה במערכת.

## 📋 קבצים

### סקירה כללית
- **[SECURITY.md](./SECURITY.md)** - סקירה כללית של אמצעי אבטחה בסיסיים

### הערכות וביקורות
- **[SECURITY_ASSESSMENT.md](./SECURITY_ASSESSMENT.md)** - הערכת אבטחה מפורטת (דירוג 7.5/10)
- **[SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)** - דוח ביקורת אבטחה מלא

### שיפורים
- **[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)** - שיפורי אבטחה שבוצעו (דירוג 9/10)
- **[SECURITY_IMPROVEMENTS_SUMMARY.md](./SECURITY_IMPROVEMENTS_SUMMARY.md)** - סיכום שיפורי אבטחה

### תכונות אבטחה ספציפיות
- **[API_KEYS_SECURITY.md](./API_KEYS_SECURITY.md)** - אבטחת מפתחות API
- **[TRUSTED_USERS_WHITELIST.md](./TRUSTED_USERS_WHITELIST.md)** - מערכת משתמשים מהימנים

## 🎯 התחלה מהירה

1. **רוצה סקירה כללית?** → קרא [SECURITY.md](./SECURITY.md)
2. **רוצה לדעת מה שופר?** → קרא [SECURITY_IMPROVEMENTS_SUMMARY.md](./SECURITY_IMPROVEMENTS_SUMMARY.md)
3. **רוצה הערכה מפורטת?** → קרא [SECURITY_ASSESSMENT.md](./SECURITY_ASSESSMENT.md)
4. **רוצה דוח ביקורת?** → קרא [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)

## 🔐 נושאים עיקריים

### Authentication & Authorization
- JWT tokens
- API keys
- Admin system
- Password hashing (bcrypt)

### Protection Mechanisms
- Rate limiting
- IP blocking
- CSRF protection
- Security headers (Helmet.js)

### Security Features
- Audit logging
- Trusted users whitelist
- File upload security
- Input validation
