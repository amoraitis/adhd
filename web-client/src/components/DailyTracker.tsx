import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle2, Circle, Save, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../api';
import type { Priority } from '../types';

interface DailyTrackerProps {
  today: string;
  dailyDate: string;
}

export const DailyTracker: React.FC<DailyTrackerProps> = ({ today, dailyDate }) => {
  // Daily tracker state
  const [selectedDate, setSelectedDate] = useState(today);
  const [brainDump, setBrainDump] = useState('');
  const [priorities, setPriorities] = useState(['', '', '']);
  const [priorityIds, setPriorityIds] = useState<(number | undefined)[]>([undefined, undefined, undefined]);
  const [worries, setWorries] = useState('');
  const [worryTime, setWorryTime] = useState('19:00');
  const [gratitude, setGratitude] = useState('');
  const [completed, setCompleted] = useState([false, false, false]);
  const [dailyEntryId, setDailyEntryId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isToday = selectedDate === today;
  const isPast = selectedDate < today;
  const isFuture = selectedDate > today;
  const isReadOnly = isPast;

  // Load daily entry on mount or when date changes
  useEffect(() => {
    loadDailyEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadDailyEntry = async () => {
    try {
      setLoading(true);
      const entry = await api.getDailyEntry(selectedDate);
      if (entry) {
        setDailyEntryId(entry.id);
        setBrainDump(entry.brainDump || '');
        
        // Load priorities from the array
        const priorityNames = ['', '', ''];
        const priorityDone = [false, false, false];
        const priorityIdList: (number | undefined)[] = [undefined, undefined, undefined];
        entry.priorities.forEach(p => {
          const index = p.importance - 1; // importance is 1-based
          if (index >= 0 && index < 3) {
            priorityNames[index] = p.name;
            priorityDone[index] = p.done;
            priorityIdList[index] = p.id;
          }
        });
        setPriorities(priorityNames);
        setCompleted(priorityDone);
        setPriorityIds(priorityIdList);
        
        setWorries(entry.worries || '');
        setWorryTime(entry.worryTime || '19:00');
        setGratitude(entry.gratitude || '');
      } else {
        // Clear form for new date
        setDailyEntryId(undefined);
        setBrainDump('');
        setPriorities(['', '', '']);
        setCompleted([false, false, false]);
        setPriorityIds([undefined, undefined, undefined]);
        setWorries('');
        setWorryTime('19:00');
        setGratitude('');
      }
    } catch (error) {
      console.error('Failed to load daily entry:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const saveDailyEntry = async () => {
    if (isReadOnly) return; // Don't save if it's a past date
    
    try {
      // Convert priorities array to Priority objects
      const priorityObjects: Priority[] = priorities
        .map((name, index) => ({
          name,
          done: completed[index],
          importance: index + 1 // 1-based importance
        }))
        .filter(p => p.name.trim() !== ''); // Only save non-empty priorities

      const entry = await api.saveDailyEntry({
        id: dailyEntryId,
        date: selectedDate,
        brainDump,
        priorities: priorityObjects,
        worries,
        worryTime,
        gratitude,
      });
      setDailyEntryId(entry.id);
    } catch (error) {
      console.error('Failed to save daily entry:', error);
    }
  };

  // Auto-save priorities when they change (but skip initial load)
  useEffect(() => {
    if (!isInitialLoad && (dailyEntryId !== undefined || priorities.some(p => p) || completed.some(c => c))) {
      const timeoutId = setTimeout(() => {
        saveDailyEntry();
      }, 500); // Quick save for priorities

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities, completed]);

  const updatePriority = (index: number, value: string) => {
    if (isReadOnly) return; // Don't allow editing in read-only mode (but allow for future dates)
    const newPriorities = [...priorities];
    newPriorities[index] = value;
    setPriorities(newPriorities);
  };

  const toggleComplete = (index: number) => {
    if (isReadOnly || isFuture) return; // Don't allow toggling in read-only mode or for future dates
    const newCompleted = [...completed];
    newCompleted[index] = !newCompleted[index];
    setCompleted(newCompleted);
  };

  const movePriorityToNextDay = async (index: number) => {
    const priorityId = priorityIds[index];
    if (!priorityId) {
      alert('Αυτή η προτεραιότητα πρέπει να αποθηκευτεί πρώτα');
      return;
    }

    if (completed[index]) {
      alert('Δεν μπορείς να μετακινήσεις ολοκληρωμένες προτεραιότητες');
      return;
    }

    try {
      const result = await api.movePriorityToNextDay(priorityId);
      alert(`Η προτεραιότητα μετακινήθηκε στις ${new Date(result.movedToDate).toLocaleDateString('el-GR')}`);
      // Reload the current day to reflect the change
      await loadDailyEntry();
    } catch (error) {
      console.error('Failed to move priority:', error);
      alert('Αποτυχία μετακίνησης προτεραιότητας: ' + (error as Error).message);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
    setIsInitialLoad(true); // Reset initial load flag when changing dates
  };

  const getDisplayDate = () => {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('el-GR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="p-6 space-y-6">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Φόρτωση ημερήσιων δεδομένων...</p>
        </div>
      ) : (
        <>
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-4 bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              title="Προηγούμενη μέρα"
            >
              <ChevronLeft className="w-5 h-5 text-indigo-600" />
            </button>
            
            <div className="flex flex-col items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsInitialLoad(true);
                }}
                className="text-center text-lg font-semibold text-indigo-900 border-2 border-indigo-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-sm text-gray-500 mt-1">{getDisplayDate()}</p>
              {isPast && (
                <span className="text-xs text-amber-600 font-semibold mt-1 bg-amber-100 px-3 py-1 rounded-full">
                  📖 Λειτουργία ανάγνωσης μόνο
                </span>
              )}
              {isToday && (
                <span className="text-xs text-green-600 font-semibold mt-1 bg-green-100 px-3 py-1 rounded-full">
                  ✨ Σήμερα
                </span>
              )}
              {isFuture && (
                <span className="text-xs text-blue-600 font-semibold mt-1 bg-blue-100 px-3 py-1 rounded-full">
                  📝 Προετοιμασία - Μόνο προτεραιότητες
                </span>
              )}
            </div>

            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              title="Επόμενη μέρα"
            >
              <ChevronRight className="w-5 h-5 text-indigo-600" />
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 mb-4">{dailyDate}</div>

      {/* Brain Dump */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-amber-600 mr-2" />
            <h2 className="text-xl font-bold text-amber-900">Brain Dump - Ξεφόρτωσε το Μυαλό</h2>
          </div>
          <button
            onClick={saveDailyEntry}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isReadOnly || isFuture}
          >
            <Save className="w-4 h-4 mr-1" />
            Αποθήκευση
          </button>
        </div>
        <p className="text-sm text-amber-700 mb-3">Γράψε ΟΛΑ όσα έχεις στο μυαλό σου (εργασίες, σκέψεις, ανησυχίες)</p>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-32 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="• Να στείλω το email στον...&#10;• Να προγραμματίσω το...&#10;• Ανησυχώ για...&#10;• Πρέπει να..."
          readOnly={isReadOnly}
          disabled={isFuture}
        />
      </div>

      {/* 3 Priorities */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-indigo-900">Οι 3 Προτεραιότητες Σήμερα</h2>
            <p className="text-sm text-indigo-700">1 σημαντικό + 2 μικρότερα πράγματα</p>
          </div>
          {isFuture && (
            <button
              onClick={saveDailyEntry}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center text-sm"
            >
              <Save className="w-4 h-4 mr-1" />
              Αποθήκευση
            </button>
          )}
        </div>
        <div className="space-y-3">
          {priorities.map((priority, index) => (
            <div key={index} className="flex items-start space-x-3">
              <button
                onClick={() => toggleComplete(index)}
                className="mt-1 flex-shrink-0"
                disabled={isFuture}
              >
                {completed[index] ? (
                  <CheckCircle2 className={`w-6 h-6 ${isFuture ? 'text-gray-400' : 'text-green-600'}`} />
                ) : (
                  <Circle className={`w-6 h-6 ${isFuture ? 'text-gray-300' : 'text-gray-400 hover:text-indigo-600'}`} />
                )}
              </button>
              <div className="flex-1">
                <div className="text-xs text-indigo-600 font-semibold mb-1">
                  {index === 0 ? '🎯 Προτεραιότητα #1 (Σημαντικό)' : `✓ Προτεραιότητα #${index + 1}`}
                </div>
                <input
                  type="text"
                  value={priority}
                  onChange={(e) => updatePriority(index, e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    completed[index] ? 'line-through text-gray-400 bg-gray-50' : ''
                  }`}
                  placeholder={index === 0 ? "Το πιο σημαντικό σήμερα..." : "Δευτερεύον καθήκον..."}
                  readOnly={isReadOnly}
                />
              </div>
              {!completed[index] && !isReadOnly && priority.trim() && (
                <button
                  onClick={() => movePriorityToNextDay(index)}
                  className="mt-7 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center text-sm font-medium"
                  title="Μετακίνηση στην επόμενη διαθέσιμη μέρα"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Επόμενη μέρα
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Worry Time */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-purple-900">Χρόνος Ανησυχίας</h2>
          <button
            onClick={saveDailyEntry}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isReadOnly || isFuture}
          >
            <Save className="w-4 h-4 mr-1" />
            Αποθήκευση
          </button>
        </div>
        <p className="text-sm text-purple-700 mb-3">Γράψε τις ανησυχίες σου εδώ - θα τις αντιμετωπίσεις αργότερα</p>
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-sm font-medium text-purple-700">Ώρα αντιμετώπισης:</span>
          <input
            type="time"
            value={worryTime}
            onChange={(e) => setWorryTime(e.target.value)}
            className="px-3 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isReadOnly || isFuture}
          />
        </div>
        <textarea
          value={worries}
          onChange={(e) => setWorries(e.target.value)}
          className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-24 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Ανησυχώ για...&#10;Τι θα γίνει αν...&#10;Με απασχολεί το..."
          readOnly={isReadOnly}
          disabled={isFuture}
        />
        <p className="text-xs text-purple-600 mt-2">💡 Όταν έρχεται ανησυχία κατά τη μέρα: "Θα το σκεφτώ στις {worryTime}"</p>
      </div>

      {/* Gratitude */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-green-900">Ευγνωμοσύνη</h2>
          <button
            onClick={saveDailyEntry}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isReadOnly || isFuture}
          >
            <Save className="w-4 h-4 mr-1" />
            Αποθήκευση
          </button>
        </div>
        <p className="text-sm text-green-700 mb-3">Τι πήγε καλά σήμερα; Για τι είσαι ευγνώμων;</p>
        <textarea
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-24 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Σήμερα είμαι ευγνώμων για...&#10;Χαίρομαι που..."
          readOnly={isReadOnly}
          disabled={isFuture}
        />
      </div>
        </>
      )}
    </div>
  );
};
