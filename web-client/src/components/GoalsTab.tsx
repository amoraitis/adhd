import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Target, CheckCircle2, Circle } from 'lucide-react';
import type { Goal } from '../types';
import { api } from '../api';

export const GoalsTab: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState<'short' | 'medium' | 'long'>('short');
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load goals from API
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async () => {
    if (newGoalTitle.trim()) {
      try {
        const newGoal = await api.createGoal({
          title: newGoalTitle,
          type: newGoalType,
          steps: [],
        });
        setGoals([...goals, newGoal]);
        setNewGoalTitle('');
      } catch (error) {
        console.error('Failed to create goal:', error);
        alert('Αποτυχία δημιουργίας στόχου');
      }
    }
  };

  const addStep = async (goalId: number, stepText: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newStep = { id: Date.now(), text: stepText, done: false };
    const updatedGoal = {
      ...goal,
      steps: [...goal.steps, newStep]
    };

    try {
      await api.updateGoal(goalId, updatedGoal);
      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (error) {
      console.error('Failed to add step:', error);
      alert('Αποτυχία προσθήκης βήματος');
    }
  };

  const toggleStep = async (goalId: number, stepId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedGoal = {
      ...goal,
      steps: goal.steps.map(step =>
        step.id === stepId ? { ...step, done: !step.done } : step
      )
    };

    try {
      await api.updateGoal(goalId, updatedGoal);
      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (error) {
      console.error('Failed to toggle step:', error);
      alert('Αποτυχία ενημέρωσης βήματος');
    }
  };

  const deleteGoal = async (goalId: number) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον στόχο;')) return;

    try {
      await api.deleteGoal(goalId);
      setGoals(goals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Αποτυχία διαγραφής στόχου');
    }
  };

  const deleteStep = async (goalId: number, stepId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedGoal = {
      ...goal,
      steps: goal.steps.filter(step => step.id !== stepId)
    };

    try {
      await api.updateGoal(goalId, updatedGoal);
      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('Αποτυχία διαγραφής βήματος');
    }
  };

  const getGoalTypeLabel = (type: string): string => {
    switch(type) {
      case 'short': return 'Βραχυπρόθεσμος';
      case 'medium': return 'Μεσοπρόθεσμος';
      case 'long': return 'Μακροπρόθεσμος';
      default: return '';
    }
  };

  const getGoalTypeColor = (type: string): string => {
    switch(type) {
      case 'short': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'long': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add New Goal */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200">
        <h2 className="text-xl font-bold text-indigo-900 mb-4">Προσθήκη Νέου Στόχου</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ο στόχος μου είναι..."
            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
          />
          <div className="flex items-center space-x-3">
            <select
              value={newGoalType}
              onChange={(e) => setNewGoalType(e.target.value as 'short' | 'medium' | 'long')}
              className="flex-1 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="short">Βραχυπρόθεσμος (1-4 εβδομάδες)</option>
              <option value="medium">Μεσοπρόθεσμος (1-3 μήνες)</option>
              <option value="long">Μακροπρόθεσμος (3+ μήνες)</option>
            </select>
            <button
              onClick={addGoal}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center"
            >
              <Plus className="w-5 h-5 mr-1" />
              Προσθήκη
            </button>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p>Φόρτωση στόχων...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Δεν έχεις προσθέσει στόχους ακόμα</p>
            <p className="text-sm mt-2">Ξεκίνα προσθέτοντας τον πρώτο σου στόχο παραπάνω!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const completedSteps = goal.steps.filter(s => s.done).length;
            const totalSteps = goal.steps.length;
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
            
            return (
              <div key={goal.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{goal.title}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full border ${getGoalTypeColor(goal.type)}`}>
                          {getGoalTypeLabel(goal.type)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Δημιουργήθηκε: {goal.created}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedGoal === goal.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {totalSteps > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Πρόοδος</span>
                        <span className="font-semibold text-indigo-600">{completedSteps}/{totalSteps} βήματα</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expanded Steps */}
                  {expandedGoal === goal.id && (
                    <div className="mt-4 space-y-3 pt-4 border-t">
                      <h4 className="font-semibold text-gray-700 mb-3">Βήματα για επίτευξη:</h4>
                      
                      {goal.steps.map((step) => (
                        <div key={step.id} className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg">
                          <button
                            onClick={() => toggleStep(goal.id, step.id)}
                            className="flex-shrink-0 mt-0.5"
                          >
                            {step.done ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400 hover:text-indigo-600" />
                            )}
                          </button>
                          <span className={`flex-1 ${step.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {step.text}
                          </span>
                          <button
                            onClick={() => deleteStep(goal.id, step.id)}
                            className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}

                      {/* Add Step */}
                      <div className="flex space-x-2 mt-3">
                        <input
                          type="text"
                          placeholder="Προσθήκη βήματος..."
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                              addStep(goal.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                            if (input && input.value.trim()) {
                              addStep(goal.id, input.value);
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
