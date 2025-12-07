import { useState, useEffect } from 'react';
import axios from 'axios';


export interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  options?: { value: string | number; label: string }[];
  required?: boolean;
}

interface GenericResourcePanelProps {
  title: string;
  endpoint: string;
  fields: Field[];
}

export function GenericResourcePanel({ title, endpoint, fields }: GenericResourcePanelProps) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(endpoint);
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching data', error);
      alert('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Process form data (convert numbers, etc.)
      const dataToSend = { ...form };
      fields.forEach(field => {
        if (field.type === 'number') {
          dataToSend[field.name] = Number(dataToSend[field.name]);
        }
        if (field.type === 'checkbox') {
          dataToSend[field.name] = Boolean(dataToSend[field.name]);
        }
        if (field.type === 'select') {
          // Check if the selected option's value in the options array is a number
          const selectedOption = field.options?.find(o => String(o.value) === String(dataToSend[field.name]));
          if (selectedOption && typeof selectedOption.value === 'number') {
            dataToSend[field.name] = Number(dataToSend[field.name]);
          }
        }
      });

      await axios.post(endpoint, dataToSend);
      fetchData();
      setForm({}); // Reset form
    } catch (error) {
      console.error('Error creating item', error);
      alert('שגיאה ביצירת פריט');
    }
  };

  const handleDelete = async (id: number) => {
    // if (!confirm('האם אתה בטוח?')) return; // Removed for easier testing
    console.log('Deleting item with id:', id);
    try {
      await axios.delete(`${endpoint}/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting item', error);
      alert('שגיאה במחיקת פריט');
    }
  };

  const handleInputChange = (field: Field, value: any) => {
    setForm((prev: any) => ({ ...prev, [field.name]: value }));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded shadow-sm">
        {fields.map((field) => (
          <div key={field.name} className={field.type === 'checkbox' ? 'flex items-center' : ''}>
            {field.type !== 'checkbox' && (
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            )}

            {field.type === 'select' ? (
              <select
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form[field.name] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                required={field.required}
              >
                <option value="">בחר {field.label}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  checked={!!form[field.name]}
                  onChange={(e) => handleInputChange(field, e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">{field.label}</span>
              </label>
            ) : (
              <input
                type={field.type}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.label}
                value={form[field.name] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}

        <div className="col-span-1 md:col-span-2 mt-2">
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium">
            הוסף {title}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-right border-collapse bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b font-semibold text-gray-600">ID</th>
              {fields.map(f => (
                <th key={f.name} className="p-3 border-b font-semibold text-gray-600">{f.label}</th>
              ))}
              <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={fields.length + 2} className="p-4 text-center text-gray-500">טוען...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={fields.length + 2} className="p-4 text-center text-gray-500">אין נתונים</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-500 text-sm">{item.id}</td>
                  {fields.map((f) => (
                    <td key={f.name} className="p-3">
                      {f.type === 'checkbox' ? (
                        item[f.name] ? '✅' : '❌'
                      ) : f.type === 'select' ? (
                        // Try to find label from options, or show raw value, or try to show nested object name if it exists (convention: fieldName without Id + .name)
                        // Actually, for generic table, handling nested relations (like department.name) is tricky without extra config.
                        // For now, let's just show the value or a simple heuristic.
                        // If the item has a property that matches the field name without 'Id' (e.g. departmentId -> department), try to show .name
                        item[f.name.replace('Id', '')]?.name ||
                        f.options?.find(o => o.value == item[f.name])?.label ||
                        item[f.name]
                      ) : (
                        item[f.name]
                      )}
                    </td>
                  ))}
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
