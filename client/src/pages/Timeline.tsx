import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/projects').then(r => r.data.projects || []),
  });

  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status === 'active' || p.status === 'on_hold');
  }, [projects]);

  // Generate days for the current month view
  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(addDays(startOfMonth(currentDate), -1));
  const nextMonth = () => setCurrentDate(addDays(endOfMonth(currentDate), 1));
  const today = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Timeline Proyek</h1>
          <p className="text-surface-500 text-sm mt-1">Pantau deadline dari semua proyek aktif.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={today} className="btn-secondary rounded-md px-3 text-sm">Hari Ini</button>
          <div className="flex items-center rounded-md border border-surface-200 bg-white overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-surface-50 text-surface-600 border-r border-surface-200"><ChevronLeft className="w-4 h-4" /></button>
            <div className="px-4 py-2 font-semibold text-surface-900 min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: id })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-surface-50 text-surface-600 border-l border-surface-200"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
            <div key={day} className="py-3 px-2 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider border-r border-surface-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-surface-200 gap-[1px]">
          {daysInMonth.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, new Date());
            
            // Find projects that have a deadline on this day
            const dayProjects = activeProjects.filter(p => p.deadline && isSameDay(new Date(p.deadline), day));

            return (
              <div 
                key={idx} 
                className={`min-h-[120px] bg-white p-2 ${!isCurrentMonth ? 'opacity-50 bg-surface-50' : ''} ${isToday ? 'bg-primary-50/30' : ''}`}
              >
                <div className={`text-right mb-2`}>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${isToday ? 'bg-primary-600 text-white font-bold' : 'text-surface-700 font-medium'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  {dayProjects.map(p => (
                    <a 
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className={`block px-2 py-1.5 text-xs rounded border cursor-pointer hover:shadow-sm transition-all truncate
                        ${p.status === 'on_hold' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'}
                      `}
                      title={p.name}
                    >
                      <div className="font-semibold truncate">{p.name}</div>
                      {p.client && <div className="text-[10px] opacity-80 truncate">{p.client.name}</div>}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
