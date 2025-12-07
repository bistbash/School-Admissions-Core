import { useState, useEffect } from 'react';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GenericResourcePanel, type Field } from './components/GenericResourcePanel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

interface ResourceConfig {
  id: string;
  label: string;
  endpoint: string;
  fields: Field[];
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('soldiers');
  const [departments, setDepartments] = useState<{ value: number, label: string }[]>([]);
  const [roles, setRoles] = useState<{ value: number, label: string }[]>([]);

  // Fetch dependencies for select options
  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          axios.get(`${API_URL}/departments`),
          axios.get(`${API_URL}/roles`)
        ]);
        setDepartments(dRes.data.map((d: any) => ({ value: d.id, label: d.name })));
        setRoles(rRes.data.map((r: any) => ({ value: r.id, label: r.name })));
      } catch (e) {
        console.error("Failed to fetch dependencies");
      }
    };
    fetchDeps();
  }, []);

  const resources: ResourceConfig[] = [
    {
      id: 'soldiers',
      label: 'חיילים',
      endpoint: `${API_URL}/soldiers`,
      fields: [
        { name: 'personalNumber', label: 'מספר אישי', type: 'text', required: true },
        { name: 'name', label: 'שם מלא', type: 'text', required: true },
        {
          name: 'type',
          label: 'סוג שירות',
          type: 'select',
          options: [
            { value: 'CONSCRIPT', label: 'חובה' },
            { value: 'PERMANENT', label: 'קבע' }
          ],
          required: true
        },
        { name: 'departmentId', label: 'מחלקה', type: 'select', options: departments, required: true },
        { name: 'roleId', label: 'תפקיד', type: 'select', options: roles, required: true },
        { name: 'isCommander', label: 'האם מפקד?', type: 'checkbox' },
      ]
    },
    {
      id: 'departments',
      label: 'מחלקות',
      endpoint: `${API_URL}/departments`,
      fields: [
        { name: 'name', label: 'שם המחלקה', type: 'text', required: true },
      ]
    },
    {
      id: 'roles',
      label: 'תפקידים',
      endpoint: `${API_URL}/roles`,
      fields: [
        { name: 'name', label: 'שם התפקיד', type: 'text', required: true },
      ]
    },
    {
      id: 'rooms',
      label: 'חדרים',
      endpoint: `${API_URL}/rooms`,
      fields: [
        { name: 'name', label: 'שם החדר', type: 'text', required: true },
        { name: 'capacity', label: 'קיבולת', type: 'number', required: true },
      ]
    }
  ];

  const activeResource = resources.find(r => r.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">מערכת ניהול משאבים צבאיים</h1>
          <p className="text-gray-500">כלי בדיקת API גנרי</p>
        </header>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          {resources.map((res) => (
            <button
              key={res.id}
              onClick={() => setActiveTab(res.id)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === res.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              )}
            >
              {res.label}
            </button>
          ))}
        </div>

        <main className="bg-white rounded-lg shadow p-6">
          {activeResource ? (
            <GenericResourcePanel
              key={activeResource.id} // Force re-mount on tab change to reset state
              title={activeResource.label}
              endpoint={activeResource.endpoint}
              fields={activeResource.fields}
            />
          ) : (
            <div>בחר משאב</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
