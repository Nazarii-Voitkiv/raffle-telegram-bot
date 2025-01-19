'use client';

import { useState, useEffect } from 'react';
import { Raffle } from '../../../../lib/db';

export default function RafflesManagement() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [formData, setFormData] = useState({
    announcement_text: '',
    title: '',
    description: '',
    prize: '',
    prize_count: 1,
    max_participants: 0,
    end_date: ''
  });

  // Завантаження розіграшів
  const loadRaffles = async () => {
    try {
      const response = await fetch('/api/admin/raffles');
      if (!response.ok) throw new Error('Failed to load raffles');
      const data = await response.json();
      setRaffles(data);
    } catch (error) {
      console.error('Error loading raffles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRaffles();
  }, []);

  // Редагування розіграшу
  const handleEdit = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setFormData({
      announcement_text: '',
      title: raffle.title,
      description: raffle.description || '',
      prize: raffle.prize,
      prize_count: raffle.prize_count,
      max_participants: raffle.max_participants,
      end_date: new Date(raffle.end_date).toISOString().slice(0, 16)
    });
    setShowForm(true);
  };

  // Створення або оновлення розіграшу
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Form data before submission:', formData);
      
      // Validate required fields
      const requiredFields = ['title', 'prize', 'prize_count', 'end_date'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        alert(`Пожалуйста, заполните обязательные поля: ${missingFields.join(', ')}`);
        return;
      }

      const formattedData = {
        ...formData,
        end_date: new Date(formData.end_date).toISOString()
      };
      
      console.log('Formatted data for submission:', formattedData);

      const url = editingRaffle 
        ? `/api/admin/raffles/${editingRaffle.id}`
        : '/api/admin/raffles';
      
      const method = editingRaffle ? 'PUT' : 'POST';
      
      console.log(`Sending ${method} request to ${url}`);
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to save raffle');
      }
      
      await loadRaffles();
      setShowForm(false);
      setEditingRaffle(null);
      setFormData({
        announcement_text: '',
        title: '',
        description: '',
        prize: '',
        prize_count: 1,
        max_participants: 0,
        end_date: ''
      });
    } catch (error) {
      console.error('Error saving raffle:', error);
      alert('Произошла ошибка при сохранении розыгрыша. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Видалення розіграшу
  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот розыгрыш?')) return;
    
    try {
      const response = await fetch(`/api/admin/raffles/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete raffle');
      
      await loadRaffles();
    } catch (error) {
      console.error('Error deleting raffle:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Для числових полів конвертуємо значення в число
    if (name === 'prize_count' || name === 'max_participants') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  // Функція для визначення статусу розіграшу
  const getRaffleStatus = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    return now <= end ? 'Активный' : 'Завершен';
  };

  return (
    <div className="p-4 min-h-screen text-white" style={{ backgroundColor: 'rgb(25, 33, 42)' }}>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            setEditingRaffle(null);
            setFormData({
              announcement_text: '',
              title: '',
              description: '',
              prize: '',
              prize_count: 1,
              max_participants: 0,
              end_date: ''
            });
            setShowForm(!showForm);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Отменить' : 'Создать розыгрыш'}
        </button>
        <button
          onClick={() => {
            const newPassword = prompt('Введите новый пароль (минимум 6 символов):');
            if (newPassword) {
              if (newPassword.length < 6) {
                alert('Пароль должен содержать минимум 6 символов');
                return;
              }
              fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPassword }),
              })
              .then(response => response.json())
              .then(data => {
                if (data.message === 'Password updated successfully') {
                  alert('Пароль успешно изменен');
                } else {
                  throw new Error(data.message);
                }
              })
              .catch(error => {
                console.error('Error changing password:', error);
                alert('Ошибка при изменении пароля');
              });
            }
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Изменить пароль
        </button>
      </div>

      {(showForm || editingRaffle) && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingRaffle(null);
                setFormData({
                  announcement_text: '',
                  title: '',
                  description: '',
                  prize: '',
                  prize_count: 1,
                  max_participants: 0,
                  end_date: ''
                });
              }}
              className="text-gray-400 hover:text-white"
            >
              Отменить
            </button>
          </div>
          <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-lg shadow" style={{ backgroundColor: 'rgb(37, 46, 59)' }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">
                  Текст объявления
                </label>
                <input
                  type="text"
                  name="announcement_text"
                  value={formData.announcement_text}
                  onChange={handleInputChange}
                  placeholder="🎉 Новый розыгрыш"
                  className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Этот текст будет отображаться первой строкой в объявлении о розыгрыше
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white">
                  Название розыгрыша
                </label>
                <input
                  type="text"
                  required
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Приз
                </label>
                <input
                  type="text"
                  required
                  name="prize"
                  value={formData.prize}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Количество призов
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  name="prize_count"
                  value={formData.prize_count}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Максимальное количество участников
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-300">
                  0 = без ограничений
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Дата окончания
                </label>
                <input
                  type="datetime-local"
                  required
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {editingRaffle ? 'Сохранить изменения' : 'Создать розыгрыш'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {!showForm && !editingRaffle && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.map((raffle) => {
            const endDate = new Date(raffle.end_date);
            const now = new Date();
            const isEnded = endDate <= now;
            
            return (
              <div key={raffle.id} className="p-6 rounded-lg shadow" style={{ backgroundColor: 'rgb(37, 46, 59)' }}>
                <h3 className="text-lg font-semibold mb-2 text-white">{raffle.title}</h3>
                <p className="text-gray-300 mb-4">{raffle.description}</p>
                <div className="mb-4 text-gray-200">
                  <p><strong>Приз для одного победителя:</strong> {raffle.prize}</p>
                  <p><strong>Победителей:</strong> {raffle.prize_count}</p>
                  <p><strong>Участников:</strong> {raffle.participant_count || 0}
                    {raffle.max_participants > 0 ? ` / ${raffle.max_participants}` : ''}
                  </p>
                  <p><strong>Дата окончания:</strong> {endDate.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    isEnded ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isEnded ? 'Завершен' : 'Активный'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(raffle)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(raffle.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
