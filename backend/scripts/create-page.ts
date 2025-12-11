#!/usr/bin/env tsx
/**
 * Page Generator - כלי ליצירת דפים חדשים במערכת
 * 
 * שימוש אינטראקטיבי:
 *   cd backend
 *   npm run create-page
 * 
 * הכלי יבקש ממך את כל הפרטים הנדרשים ויוצר:
 * 1. עדכון permission-registry.ts
 * 2. יצירת קומפוננטת React ב-frontend
 * 3. יצירת תיעוד
 */

import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PageConfig {
  name: string; // e.g., "my-page"
  displayName: string; // e.g., "My Page"
  displayNameHebrew: string; // e.g., "הדף שלי"
  description: string; // e.g., "Manage my resources"
  descriptionHebrew: string; // e.g., "ניהול המשאבים שלי"
  category: 'general' | 'academic' | 'administration' | 'security';
  categoryHebrew: 'כללי' | 'אקדמי' | 'ניהול' | 'אבטחה';
  supportsEditMode: boolean;
  viewAPIs: Array<{
    resource: string;
    action: string;
    method: string;
    path: string;
    description: string;
    descriptionHebrew: string;
  }>;
  editAPIs: Array<{
    resource: string;
    action: string;
    method: string;
    path: string;
    description: string;
    descriptionHebrew: string;
  }>;
  customModes?: Array<{
    id: string;
    name: string;
    nameHebrew: string;
    description: string;
    descriptionHebrew: string;
    viewAPIs?: Array<any>;
    editAPIs?: Array<any>;
  }>;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              📄 Page Generator Tool                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

// Colors
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printSuccess(msg: string) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function printInfo(msg: string) {
  console.log(`${CYAN}ℹ️  ${msg}${RESET}`);
}

function printHeader(msg: string) {
  console.log(`${BOLD}${BLUE}${msg}${RESET}`);
}

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function collectPageInfo(): Promise<PageConfig> {
  console.log(BANNER);
  printHeader('Creating a new page in the system');
  console.log('');
  printInfo('Please fill in the following details:');
  console.log('');

  const name = await question('שם הדף (באנגלית, עם מקפים, לדוגמה: my-page): ');
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error('שם הדף חייב להיות באנגלית, עם אותיות קטנות ומקפים בלבד');
  }

  const displayName = await question('שם תצוגה (באנגלית, לדוגמה: My Page): ');
  const displayNameHebrew = await question('שם תצוגה בעברית (לדוגמה: הדף שלי): ');
  const description = await question('תיאור (באנגלית): ');
  const descriptionHebrew = await question('תיאור בעברית: ');

  console.log('\nקטגוריות זמינות:');
  console.log('1. general - כללי');
  console.log('2. academic - אקדמי');
  console.log('3. administration - ניהול');
  console.log('4. security - אבטחה');
  const categoryChoice = await question('בחר קטגוריה (1-4): ');
  
  const categories = {
    '1': { category: 'general' as const, categoryHebrew: 'כללי' as const },
    '2': { category: 'academic' as const, categoryHebrew: 'אקדמי' as const },
    '3': { category: 'administration' as const, categoryHebrew: 'ניהול' as const },
    '4': { category: 'security' as const, categoryHebrew: 'אבטחה' as const },
  };
  
  const selectedCategory = categories[categoryChoice as keyof typeof categories];
  if (!selectedCategory) {
    throw new Error('קטגוריה לא תקינה');
  }

  const supportsEditMode = (await question('האם הדף תומך במצב עריכה? (y/n): ')).toLowerCase() === 'y';

  console.log('\n📡 הגדרת API Endpoints');
  console.log('כעת נגדיר את ה-APIs שהדף צריך.\n');

  const viewAPIs: PageConfig['viewAPIs'] = [];
  const editAPIs: PageConfig['editAPIs'] = [];

  console.log('הרשאות צפייה (View APIs):');
  let addMore = true;
  while (addMore) {
    const resource = await question('  Resource (לדוגמה: students): ');
    const action = await question('  Action (לדוגמה: read): ');
    const method = await question('  Method (GET/POST/PUT/DELETE): ');
    const apiPath = await question('  Path (לדוגמה: /api/students): ');
    const desc = await question('  Description (באנגלית): ');
    const descHebrew = await question('  Description בעברית: ');

    viewAPIs.push({
      resource,
      action,
      method: method.toUpperCase(),
      path: apiPath,
      description: desc,
      descriptionHebrew: descHebrew,
    });

    addMore = (await question('  להוסיף עוד API לצפייה? (y/n): ')).toLowerCase() === 'y';
  }

  if (supportsEditMode) {
    console.log('\nהרשאות עריכה (Edit APIs):');
    addMore = true;
    while (addMore) {
      const resource = await question('  Resource (לדוגמה: students): ');
      const action = await question('  Action (לדוגמה: create): ');
      const method = await question('  Method (GET/POST/PUT/DELETE): ');
      const apiPath = await question('  Path (לדוגמה: /api/students): ');
      const desc = await question('  Description (באנגלית): ');
      const descHebrew = await question('  Description בעברית: ');

      editAPIs.push({
        resource,
        action,
        method: method.toUpperCase(),
        path: apiPath,
        description: desc,
        descriptionHebrew: descHebrew,
      });

      addMore = (await question('  להוסיף עוד API לעריכה? (y/n): ')).toLowerCase() === 'y';
    }
  }

  // Custom modes
  const customModes: PageConfig['customModes'] = [];
  const hasCustomModes = (await question('\nהאם יש מצבי צפייה מותאמים אישית? (y/n): ')).toLowerCase() === 'y';
  
  if (hasCustomModes) {
    addMore = true;
    while (addMore) {
      const modeId = await question('  ID של מצב (לדוגמה: teacher): ');
      const modeName = await question('  שם מצב (באנגלית): ');
      const modeNameHebrew = await question('  שם מצב בעברית: ');
      const modeDesc = await question('  תיאור (באנגלית): ');
      const modeDescHebrew = await question('  תיאור בעברית: ');

      customModes.push({
        id: modeId,
        name: modeName,
        nameHebrew: modeNameHebrew,
        description: modeDesc,
        descriptionHebrew: modeDescHebrew,
      });

      addMore = (await question('  להוסיף עוד מצב? (y/n): ')).toLowerCase() === 'y';
    }
  }

  return {
    name,
    displayName,
    displayNameHebrew,
    description,
    descriptionHebrew,
    category: selectedCategory.category,
    categoryHebrew: selectedCategory.categoryHebrew,
    supportsEditMode,
    viewAPIs,
    editAPIs,
    customModes: customModes.length > 0 ? customModes : undefined,
  };
}

function generatePermissionRegistryEntry(config: PageConfig): string {
  const viewAPIsStr = config.viewAPIs.map(api => 
    `      { resource: '${api.resource}', action: '${api.action}', method: '${api.method}', path: '${api.path}', description: '${api.description}', descriptionHebrew: '${api.descriptionHebrew}' },`
  ).join('\n');

  const editAPIsStr = config.editAPIs.map(api => 
    `      { resource: '${api.resource}', action: '${api.action}', method: '${api.method}', path: '${api.path}', description: '${api.description}', descriptionHebrew: '${api.descriptionHebrew}' },`
  ).join('\n');

  const customModesStr = config.customModes?.map(mode => 
    `    { id: '${mode.id}', name: '${mode.name}', nameHebrew: '${mode.nameHebrew}', description: '${mode.description}', descriptionHebrew: '${mode.descriptionHebrew}' },`
  ).join('\n');

  return `
  // ${config.displayNameHebrew} - ${config.displayName}
  '${config.name}': {
    page: '${config.name}',
    displayName: '${config.displayName}',
    displayNameHebrew: '${config.displayNameHebrew}',
    description: '${config.description}',
    descriptionHebrew: '${config.descriptionHebrew}',
    detailedExplanation: '${config.descriptionHebrew} - ${config.description}',
    category: '${config.category}',
    categoryHebrew: '${config.categoryHebrew}',
    viewAPIs: [
${viewAPIsStr}
    ],
    editAPIs: [
${editAPIsStr}
    ],
    supportsEditMode: ${config.supportsEditMode},${config.customModes ? `
    customModes: [
${customModesStr}
    ],` : ''}
  },`;
}

async function addToPermissionRegistry(config: PageConfig) {
  const registryPath = path.join(__dirname, '../src/lib/permissions/permission-registry.ts');
  let content = await fs.readFile(registryPath, 'utf-8');
  
  // Find the closing brace of PAGE_PERMISSIONS - look for }; before "Get unique API permissions"
  const entry = generatePermissionRegistryEntry(config);
  
  // Find the last entry before the closing };
  // Pattern: look for }; followed by /** and "Get unique"
  const pattern = /(\s+)(\},?\s*);\s*\/\*\*\s*\n\s*\* Get unique API permissions/;
  const match = content.match(pattern);
  
  if (match) {
    const indent = match[1];
    const beforeMatch = content.substring(0, content.indexOf(match[0]));
    const afterMatch = content.substring(content.indexOf(match[0]) + match[0].length);
    content = beforeMatch + match[2] + ',' + entry + indent + ');' + afterMatch;
  } else {
    // Try simpler pattern - just find }; before the comment
    const simplePattern = /(\s+)(\},?\s*);\s*\/\*\*\s*\n\s*\* Get unique/;
    const simpleMatch = content.match(simplePattern);
    if (simpleMatch) {
      const indent = simpleMatch[1];
      const beforeMatch = content.substring(0, content.indexOf(simpleMatch[0]));
      const afterMatch = content.substring(content.indexOf(simpleMatch[0]) + simpleMatch[0].length);
      content = beforeMatch + simpleMatch[2] + ',' + entry + indent + ');' + afterMatch;
    } else {
      // Last resort - find the last }; before export
      const lastBracePattern = /(\s+)(\},?\s*);\s*\n\s*export function getUniqueAPIPermissions/;
      const lastMatch = content.match(lastBracePattern);
      if (lastMatch) {
        const indent = lastMatch[1];
        const beforeMatch = content.substring(0, content.indexOf(lastMatch[0]));
        const afterMatch = content.substring(content.indexOf(lastMatch[0]) + lastMatch[0].length);
        content = beforeMatch + lastMatch[2] + ',' + entry + indent + ');' + afterMatch;
      } else {
        throw new Error('לא ניתן למצוא את סוף PAGE_PERMISSIONS. אנא הוסף את הדף ידנית ל-permission-registry.ts לפני השורה: export function getUniqueAPIPermissions');
      }
    }
  }
  
  await fs.writeFile(registryPath, content, 'utf-8');
  console.log('✅ עודכן permission-registry.ts');
}

function generateFrontendPageTemplate(config: PageConfig): string {
  const componentName = config.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('') + 'Page';

  const firstViewAPI = config.viewAPIs[0]?.path || '/api/your-endpoint';
  const editModeSection = config.supportsEditMode ? `
            {canEdit && mode === 'edit' && (
              <div className="mt-4">
                <Button>
                  הוסף חדש
                </Button>
              </div>
            )}` : '';

  return `import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { usePageMode } from '../permissions/PageModeContext';
import { usePermissions } from '../permissions/PermissionsContext';
import { PageWrapper } from '../../shared/components/PageWrapper';

export function ${componentName}() {
  const { mode } = usePageMode();
  const { hasPagePermission } = usePermissions();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // Example:
      // const res = await apiClient.get('${firstViewAPI}');
      // setData(res.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canView = hasPagePermission('${config.name}', 'view');
  const canEdit = hasPagePermission('${config.name}', 'edit');

  return (
    <PageWrapper
      page="${config.name}"
      title="${config.displayNameHebrew}"
      description="${config.descriptionHebrew}"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <Card variant="default">
          <CardHeader>
            <CardTitle>${config.displayNameHebrew}</CardTitle>
            <CardDescription>${config.descriptionHebrew}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Add your page content here */}
            <p className="text-gray-600 dark:text-gray-400">
              תוכן הדף יופיע כאן
            </p>
${editModeSection}
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
`;
}

async function createFrontendPage(config: PageConfig) {
  const componentName = config.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('') + 'Page';
  
  // Get the project root (go up from backend/scripts to project root)
  const projectRoot = path.join(__dirname, '../..');
  const pagePath = path.join(projectRoot, 'frontend/src/features', config.name, `${componentName}.tsx`);
  const pageDir = path.dirname(pagePath);
  
  await fs.mkdir(pageDir, { recursive: true });
  const template = generateFrontendPageTemplate(config);
  await fs.writeFile(pagePath, template, 'utf-8');
  console.log(`✅ נוצר קובץ: ${pagePath}`);
}

async function generateDocumentation(config: PageConfig) {
  const viewAPIsList = config.viewAPIs.map(api => `- ${api.descriptionHebrew} (${api.method} ${api.path})`).join('\n');
  const editAPIsList = config.supportsEditMode 
    ? config.editAPIs.map(api => `- ${api.descriptionHebrew} (${api.method} ${api.path})`).join('\n')
    : 'הדף הזה תומך רק בצפייה';
  
  const customModesSection = config.customModes && config.customModes.length > 0 
    ? `\n## מצבי צפייה מותאמים אישית\n\n${config.customModes.map(mode => `### ${mode.nameHebrew} (${mode.name})\n${mode.descriptionHebrew}\n\n${mode.description}`).join('\n\n')}`
    : '';

  const doc = `# ${config.displayNameHebrew} - ${config.displayName}

## תיאור
${config.descriptionHebrew}

${config.description}

## הרשאות

### צפייה
הרשאת צפייה מאפשרת:
${viewAPIsList}

### עריכה
${editAPIsList}${customModesSection}

## API Endpoints

### View APIs
${config.viewAPIs.map(api => `- \`${api.method} ${api.path}\` - ${api.descriptionHebrew}`).join('\n')}

${config.supportsEditMode ? `### Edit APIs
${config.editAPIs.map(api => `- \`${api.method} ${api.path}\` - ${api.descriptionHebrew}`).join('\n')}` : ''}
`;

  const projectRoot = path.join(__dirname, '../..');
  const docPath = path.join(projectRoot, 'docs/pages', `${config.name}.md`);
  const docDir = path.dirname(docPath);
  await fs.mkdir(docDir, { recursive: true });
  await fs.writeFile(docPath, doc, 'utf-8');
  console.log(`✅ נוצר קובץ תיעוד: ${docPath}`);
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    let config: PageConfig;
    
    // Check if running in interactive mode or with arguments
    if (args.length === 0 || args.some(arg => arg === '--interactive' || arg === '-i')) {
      config = await collectPageInfo();
    } else {
      // Parse command line arguments
      const argMap: Record<string, string> = {};
      args.forEach(arg => {
        const [key, value] = arg.replace('--', '').split('=');
        if (key && value) argMap[key] = value;
      });

      if (!argMap.name) {
        throw new Error('שם הדף נדרש. השתמש ב: --name=my-page');
      }

      const categoryMap = {
        'general': { category: 'general' as const, categoryHebrew: 'כללי' as const },
        'academic': { category: 'academic' as const, categoryHebrew: 'אקדמי' as const },
        'administration': { category: 'administration' as const, categoryHebrew: 'ניהול' as const },
        'security': { category: 'security' as const, categoryHebrew: 'אבטחה' as const },
      } as const;
      
      const selectedCategory = (argMap.category && categoryMap[argMap.category as keyof typeof categoryMap]) || categoryMap['general'];
      
      config = {
        name: argMap.name,
        displayName: argMap.displayName || argMap.name,
        displayNameHebrew: argMap.hebrew || argMap.displayNameHebrew || argMap.name,
        description: argMap.description || '',
        descriptionHebrew: argMap.descriptionHebrew || argMap.hebrew || '',
        category: selectedCategory.category,
        categoryHebrew: selectedCategory.categoryHebrew,
        supportsEditMode: argMap.supportsEditMode !== 'false',
        viewAPIs: [],
        editAPIs: [],
      };
    }

    console.log('\n📝 יוצר את הקבצים...\n');

    // Add to permission registry
    await addToPermissionRegistry(config);
    
    // Create frontend page
    await createFrontendPage(config);
    
    // Generate documentation
    await generateDocumentation(config);

    console.log('\n✅ הדף נוצר בהצלחה!\n');
    console.log('📋 מה הלאה?');
    console.log('1. עדכן את ה-routing ב-frontend (App.tsx או router file)');
    console.log('2. הוסף את הדף ל-sidebar navigation');
    console.log('3. הוסף את ה-API endpoints ב-backend אם הם לא קיימים');
    console.log('4. בדוק את התיעוד שנוצר ב: docs/pages/' + config.name + '.md\n');

  } catch (error: any) {
    console.error('\n❌ שגיאה:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();