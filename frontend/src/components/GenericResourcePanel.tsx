import { useState, useEffect } from 'react';
import apiClient from '../lib/api';


export interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'password' | 'email';
  options?: { value: string | number; label: string }[];
  required?: boolean;
}

interface GenericResourcePanelProps {
  title: string;
  endpoint: string;
  fields: Field[];
}

export function GenericResourcePanel({ title, endpoint, fields }: GenericResourcePanelProps) {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(endpoint);
      setItems(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'שגיאה בטעינת נתונים';
      setError(message);
      console.error('Error fetching data', err);
      
      // If unauthorized, the API client will handle token removal
      // But we should still show the error
      if (err?.response?.status === 401) {
        setError('נדרשת התחברות - אנא התחבר מחדש');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const processFormData = (formData: Record<string, any>) => {
    const processed: Record<string, any> = {};
    fields.forEach(field => {
      const value = formData[field.name];
      
      // Handle empty/null/undefined values
      if (value === '' || value === null || value === undefined) {
        // Checkboxes should always be included (as false)
        if (field.type === 'checkbox') {
          processed[field.name] = false;
        }
        // For required fields, keep the empty value to trigger validation
        else if (field.required) {
          processed[field.name] = value;
        }
        // For optional fields, omit them entirely from the payload
        // This allows the server to treat them as unset
        return;
      }

      // Process non-empty values
      if (field.type === 'number') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          processed[field.name] = numValue;
        } else if (field.required) {
          // Keep invalid number for required fields to trigger validation
          processed[field.name] = value;
        }
      } else if (field.type === 'checkbox') {
        processed[field.name] = Boolean(value);
      } else if (field.type === 'select') {
        const selectedOption = field.options?.find(o => String(o.value) === String(value));
        if (selectedOption) {
          // Use the option's value (preserves type)
          processed[field.name] = selectedOption.value;
        } else if (field.required) {
          // Keep the value for required fields to trigger validation
          processed[field.name] = value;
        }
        // For optional select fields with no valid selection, omit them
      } else {
        // Text fields
        processed[field.name] = value;
      }
    });
    return processed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const dataToSend = processFormData(form);

      if (editingId) {
        await apiClient.put(`${endpoint}/${editingId}`, dataToSend);
      } else {
        await apiClient.post(endpoint, dataToSend);
      }
      
      await fetchData();
      setForm({});
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בשמירת פריט';
      setError(message);
      console.error('Error saving item', err);
    }
  };

  const handleDelete = async (id: number) => {
    console.log('handleDelete called with id:', id);
    console.log('Current items:', items);
    
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק פריט זה?');
    console.log('Confirm result:', confirmed);
    
    if (!confirmed) {
      console.log('Delete cancelled by user');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      console.log('Deleting item:', id, 'from endpoint:', `${endpoint}/${id}`);
      const response = await apiClient.delete(`${endpoint}/${id}`);
      console.log('Delete successful, response:', response);
      // Remove the item from local state immediately for better UX
      setItems(prev => {
        const filtered = prev.filter(item => item.id !== id);
        console.log('Updated items after delete:', filtered);
        return filtered;
      });
      // Then refresh to get the latest data from server
      await fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'שגיאה במחיקת פריט';
      setError(message);
      console.error('Error deleting item:', err);
      console.error('Error details:', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message
      });
      // Still refresh to get current state
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Record<string, any>) => {
    setEditingId(item.id);
    const formData: Record<string, any> = {};
    fields.forEach(field => {
      formData[field.name] = item[field.name] ?? (field.type === 'checkbox' ? false : '');
    });
    setForm(formData);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const handleInputChange = (field: Field, value: any) => {
    setForm((prev) => ({ ...prev, [field.name]: value }));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

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
                type={
                  field.type === 'password' ? 'password' :
                  field.type === 'email' ? 'email' :
                  field.type === 'number' ? 'number' :
                  'text'
                }
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.label}
                value={form[field.name] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                required={field.required}
                minLength={field.type === 'password' ? 8 : undefined}
              />
            )}
          </div>
        ))}

        <div className="col-span-1 md:col-span-2 mt-2 flex gap-2">
          <button 
            type="submit" 
            className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium"
          >
            {editingId ? 'עדכן' : `הוסף ${title}`}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
            >
              ביטול
            </button>
          )}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        ערוך
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('=== DELETE BUTTON CLICKED ===');
                          console.log('Item:', item);
                          console.log('Item ID:', item.id);
                          console.log('Item ID type:', typeof item.id);
                          alert(`Attempting to delete item with ID: ${item.id}`);
                          handleDelete(item.id);
                        }}
                        className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      >
                        מחק
                      </button>
                    </div>
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
