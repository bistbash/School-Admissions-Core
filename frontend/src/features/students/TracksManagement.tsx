import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Modal } from '../../shared/ui/Modal';
import { apiClient } from '../../shared/lib/api';

interface Track {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export function TracksManagement() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/tracks');
      setTracks(response.data || []);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', description: '' });
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleEdit = (track: Track) => {
    setSelectedTrack(track);
    setFormData({ name: track.name, description: track.description || '' });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המגמה?')) {
      return;
    }

    try {
      await apiClient.delete(`/tracks/${id}`);
      await loadTracks();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'שגיאה במחיקת המגמה');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrors({ name: 'שם מגמה הוא שדה חובה' });
      return;
    }

    try {
      if (selectedTrack) {
        await apiClient.put(`/tracks/${selectedTrack.id}`, formData);
      } else {
        await apiClient.post('/tracks', formData);
      }
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedTrack(null);
      await loadTracks();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בשמירת המגמה';
      setErrors({ submit: errorMessage });
    }
  };

  const activeTracks = tracks.filter((t) => t.isActive);
  const inactiveTracks = tracks.filter((t) => !t.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">ניהול מגמות</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">ניהול מגמות הלימוד במערכת</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף מגמה
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {/* Active Tracks */}
          <Card>
            <CardHeader>
              <CardTitle>מגמות פעילות ({activeTracks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTracks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  אין מגמות פעילות
                </p>
              ) : (
                <div className="space-y-2">
                  {activeTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808]"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">{track.name}</p>
                        {track.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {track.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(track)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(track.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Tracks */}
          {inactiveTracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>מגמות לא פעילות ({inactiveTracks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inactiveTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#0F0F0F] opacity-60"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">{track.name}</p>
                        {track.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {track.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedTrack(null);
          setFormData({ name: '', description: '' });
          setErrors({});
        }}
        title={selectedTrack ? 'ערוך מגמה' : 'הוסף מגמה חדשה'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="שם מגמה *"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
            required
            placeholder="הזן שם מגמה"
          />
          <Input
            label="תיאור"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="תיאור אופציונלי"
          />
          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedTrack(null);
                setFormData({ name: '', description: '' });
                setErrors({});
              }}
            >
              ביטול
            </Button>
            <Button type="submit">{selectedTrack ? 'שמור שינויים' : 'הוסף מגמה'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
