const XLSX = require('xlsx');

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Sample data for שכבה ט (Class 9)
// Row 1: Empty (will be skipped)
// Row 2: Empty (will be skipped)
// Row 3: Headers
const dataTet = [
  [], // Row 1 - empty
  [], // Row 2 - empty
  ['מספר ת.ז', 'שם משפחה', 'שם פרטי', 'כיתה', 'מקבילה', 'מין', 'תאריך לידה', 'דואר אלקטרוני', 'מגמה', 'תאריך עליה', 'יישוב', 'כתובת', 'יישוב 2', 'כתובת 2', 'טלפון', 'טלפון נייד', 'ת.ז הורים 1', 'שם פרטי הורים 1', 'שם משפחה הורים 1', 'סוג הורים 1', 'טלפון נייד הורים 1', 'דואר אלקטרוני הורים 1', 'ת.ז הורים 2', 'שם פרטי הורים 2', 'שם משפחה הורים 2', 'סוג הורים 2', 'טלפון נייד הורים 2', 'דואר אלקטרוני הורים 2'],
  ['123456789', 'כהן', 'יוסי', 'ט\'', '1', 'זכר', '2008-05-15', 'yossi.cohen@example.com', 'מדעי המחשב', '', 'תל אביב', 'רחוב הרצל 1', '', '', '03-1234567', '050-1234567', '111111111', 'אבי', 'כהן', 'אב', '050-1111111', 'avi.cohen@example.com', '222222222', 'רותי', 'כהן', 'אם', '050-2222222', 'ruti.cohen@example.com'],
  ['987654321', 'לוי', 'שרה', 'ט\'', '2', 'נקבה', '2008-08-20', 'sara.levi@example.com', 'פיזיקה', '', 'ירושלים', 'רחוב יפו 10', '', '', '02-9876543', '050-9876543', '333333333', 'דני', 'לוי', 'אב', '050-3333333', 'dani.levi@example.com', '', '', '', '', '', ''],
];

// Sample data for שכבה יא (Class 11)
const dataYudAlef = [
  [],
  [],
  ['מספר ת.ז', 'שם משפחה', 'שם פרטי', 'כיתה', 'מקבילה', 'מין', 'תאריך לידה', 'דואר אלקטרוני', 'מגמה', 'תאריך עליה', 'יישוב', 'כתובת', 'יישוב 2', 'כתובת 2', 'טלפון', 'טלפון נייד', 'ת.ז הורים 1', 'שם פרטי הורים 1', 'שם משפחה הורים 1', 'סוג הורים 1', 'טלפון נייד הורים 1', 'דואר אלקטרוני הורים 1', 'ת.ז הורים 2', 'שם פרטי הורים 2', 'שם משפחה הורים 2', 'סוג הורים 2', 'טלפון נייד הורים 2', 'דואר אלקטרוני הורים 2'],
  ['456789123', 'ישראל', 'דוד', 'י"א', '3', 'זכר', '2007-03-10', 'david.israel@example.com', 'כימיה', '', 'חיפה', 'רחוב הרצל 5', '', '', '04-4567890', '050-4567890', '444444444', 'מיכאל', 'ישראל', 'אב', '050-4444444', 'michael.israel@example.com', '', '', '', '', '', ''],
];

// Create worksheets
const worksheetTet = XLSX.utils.aoa_to_sheet(dataTet);
const worksheetYudAlef = XLSX.utils.aoa_to_sheet(dataYudAlef);

// Add worksheets to workbook with proper names
XLSX.utils.book_append_sheet(workbook, worksheetTet, 'שכבה ט');
XLSX.utils.book_append_sheet(workbook, worksheetYudAlef, 'שכבה יא');

// Write file
XLSX.writeFile(workbook, 'students_example.xlsx');

console.log('✅ Excel file created: students_example.xlsx');
console.log('   - Sheet 1: שכבה ט (Class 9)');
console.log('   - Sheet 2: שכבה יא (Class 11)');
console.log('   - Data starts from row 3');
