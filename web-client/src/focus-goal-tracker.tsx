import React, { useState } from 'react';
import { Calendar, Target } from 'lucide-react';
import { DailyTracker } from './components/DailyTracker';
import { GoalsTab } from './components/GoalsTab';

const FocusGoalTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'goals'>('daily');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const dailyDate = new Date().toLocaleDateString('el-GR');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Σύστημα Εστίασης & Στόχων</h1>
            <p className="text-indigo-100">Οργάνωσε τη μέρα σου και πέτυχε τους στόχους σου</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'daily'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="inline-block w-5 h-5 mr-2" />
              Ημερήσιος Tracker
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'goals'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Target className="inline-block w-5 h-5 mr-2" />
              Στόχοι
            </button>
          </div>

          {/* Daily Tracker Tab */}
          {activeTab === 'daily' && <DailyTracker today={today} dailyDate={dailyDate} />}

          {/* Goals Tab */}
          {activeTab === 'goals' && <GoalsTab />}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3">💡 Συμβουλές Χρήσης</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Πρωί:</strong> Ξεκίνα με Brain Dump και διάλεξε τις 3 προτεραιότητες</li>
            <li>• <strong>Κατά τη διάρκεια της μέρας:</strong> Αν έρχονται ανησυχίες, γράψε τες και πες "θα τις σκεφτώ αργότερα"</li>
            <li>• <strong>Βράδυ:</strong> Τσέκαρε τις προτεραιότητες, γράψε ευγνωμοσύνη, διάβασε τις ανησυχίες (πολλές θα φαίνονται ασήμαντες)</li>
            <li>• <strong>Στόχοι:</strong> Σπάσε κάθε στόχο σε μικρά, συγκεκριμένα βήματα - "Να γυμναστώ" → "Δευτέρα 8πμ, 30 λεπτά"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FocusGoalTracker;