import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Edit2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import type { RecurringPriority } from '../types';

export const RecurringPriorities: React.FC = () => {
  const [templates, setTemplates] = useState<RecurringPriority[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<RecurringPriority, 'id' | 'createdAt'>>({
    name: '',
    cronExpression: '0 0 * * *', // Daily at midnight by default
    isActive: true,
    importance: 1,
  });

  useEffect(() => {
    if (isExpanded && templates.length === 0) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const loadTemplates = async () => {
    try {
      const data = await api.getRecurringPriorities();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load recurring priorities:', error);
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.cronExpression.trim()) return;

    try {
      await api.createRecurringPriority(newTemplate);
      setIsAdding(false);
      setNewTemplate({
        name: '',
        cronExpression: '0 0 * * *',
        isActive: true,
        importance: 1,
      });
      await loadTemplates();
    } catch (error) {
      console.error('Failed to create recurring priority:', error);
      alert('Αποτυχία δημιουργίας επαναλαμβανόμενης προτεραιότητας');
    }
  };

  const handleUpdate = async (id: number, template: RecurringPriority) => {
    try {
      await api.updateRecurringPriority(id, template);
      setEditingId(null);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to update recurring priority:', error);
      alert('Αποτυχία ενημέρωσης επαναλαμβανόμενης προτεραιότητας');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Είσαι σίγουρος; Θα διαγραφούν όλες οι μελλοντικές εμφανίσεις.')) return;

    try {
      await api.deleteRecurringPriority(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete recurring priority:', error);
      alert('Αποτυχία διαγραφής επαναλαμβανόμενης προτεραιότητας');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.toggleRecurringPriority(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to toggle recurring priority:', error);
      alert('Αποτυχία αλλαγής κατάστασης επαναλαμβανόμενης προτεραιότητας');
    }
  };

  const getCronDescription = (cron: string): string => {
    const presets: { [key: string]: string } = {
      '0 0 * * *': 'Κάθε μέρα στα μεσάνυχτα',
      '0 0 * * 1-5': 'Καθημερινές (Δευ-Παρ)',
      '0 0 * * 0,6': 'Σαββατοκύριακα',
      '0 0 * * 1': 'Κάθε Δευτέρα',
      '0 0 * * 2': 'Κάθε Τρίτη',
      '0 0 * * 3': 'Κάθε Τετάρτη',
      '0 0 * * 4': 'Κάθε Πέμπτη',
      '0 0 * * 5': 'Κάθε Παρασκευή',
      '0 0 * * 6': 'Κάθε Σάββατο',
      '0 0 * * 0': 'Κάθε Κυριακή',
    };
    return presets[cron] || cron;
  };

  const cronPresets = [
    { value: '0 0 * * *', label: 'Κάθε μέρα' },
    { value: '0 0 * * 1-5', label: 'Καθημερινές (Δευ-Παρ)' },
    { value: '0 0 * * 0,6', label: 'Σαββατοκύριακα' },
    { value: '0 0 * * 1', label: 'Κάθε Δευτέρα' },
    { value: '0 0 * * 2', label: 'Κάθε Τρίτη' },
    { value: '0 0 * * 3', label: 'Κάθε Τετάρτη' },
    { value: '0 0 * * 4', label: 'Κάθε Πέμπτη' },
    { value: '0 0 * * 5', label: 'Κάθε Παρασκευή' },
    { value: '0 0 * * 6', label: 'Κάθε Σάββατο' },
    { value: '0 0 * * 0', label: 'Κάθε Κυριακή' },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-purple-100/50 transition-colors rounded-xl"
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-purple-600 mr-2" /> : <ChevronDown className="w-5 h-5 text-purple-600 mr-2" />}
          <div className="text-left">
            <h2 className="text-xl font-bold text-purple-900">🔄 Επαναλαμβανόμενες Προτεραιότητες</h2>
            <p className="text-sm text-purple-700">Προτεραιότητες που επαναλαμβάνονται αυτόματα</p>
          </div>
        </div>
        <span className="text-sm text-purple-600">{isExpanded ? 'Κλείσιμο' : 'Άνοιγμα'}</span>
      </button>
      
      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center text-sm"
            >
              {isAdding ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {isAdding ? 'Ακύρωση' : 'Νέα'}
            </button>
          </div>

      {/* Add New Template Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-purple-300">
          <input
            type="text"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            placeholder="Όνομα προτεραιότητας..."
            className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 mb-2"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-purple-700 font-semibold mb-1 block">Σημαντικότητα</label>
              <select
                value={newTemplate.importance}
                onChange={(e) => setNewTemplate({ ...newTemplate, importance: Number(e.target.value) })}
                className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value={1}>🎯 Πιο σημαντικό (#1)</option>
                <option value={2}>✓ Μεσαίο (#2)</option>
                <option value={3}>✓ Λιγότερο (#3)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-purple-700 font-semibold mb-1 block">Επανάληψη (Preset)</label>
              <select
                value={newTemplate.cronExpression}
                onChange={(e) => setNewTemplate({ ...newTemplate, cronExpression: e.target.value })}
                className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {cronPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-purple-700 font-semibold mb-1 block">
              Cron Expression (Για προχωρημένους)
            </label>
            <input
              type="text"
              value={newTemplate.cronExpression}
              onChange={(e) => setNewTemplate({ ...newTemplate, cronExpression: e.target.value })}
              placeholder="0 0 * * *"
              className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
            />
            <p className="text-xs text-purple-600 mt-1">
              Μορφή: minute hour day month day-of-week (π.χ. "0 0 * * 1-5" για καθημερινές)
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={!newTemplate.name.trim()}
            className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 mr-1" />
            Δημιουργία
          </button>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-center text-purple-600 py-4">Δεν υπάρχουν επαναλαμβανόμενες προτεραιότητες</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                template.isActive
                  ? 'bg-white border-purple-300'
                  : 'bg-gray-100 border-gray-300 opacity-60'
              }`}
            >
              {editingId === template.id ? (
                <EditForm
                  template={template}
                  onSave={(updated) => handleUpdate(template.id!, updated)}
                  onCancel={() => setEditingId(null)}
                  cronPresets={cronPresets}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${template.isActive ? 'text-purple-900' : 'text-gray-600'}`}>
                        {template.name}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        #{template.importance}
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {getCronDescription(template.cronExpression)}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      {template.cronExpression}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggle(template.id!)}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                      title={template.isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                    >
                      {template.isActive ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingId(template.id!)}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Επεξεργασία"
                    >
                      <Edit2 className="w-4 h-4 text-purple-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id!)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Διαγραφή"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
        </div>
      )}
    </div>
  );
};

const EditForm: React.FC<{
  template: RecurringPriority;
  onSave: (template: RecurringPriority) => void;
  onCancel: () => void;
  cronPresets: { value: string; label: string }[];
}> = ({ template, onSave, onCancel, cronPresets }) => {
  const [edited, setEdited] = useState<RecurringPriority>(template);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={edited.name}
        onChange={(e) => setEdited({ ...edited, name: e.target.value })}
        className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={edited.importance}
          onChange={(e) => setEdited({ ...edited, importance: Number(e.target.value) })}
          className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
        >
          <option value={1}>🎯 Πιο σημαντικό (#1)</option>
          <option value={2}>✓ Μεσαίο (#2)</option>
          <option value={3}>✓ Λιγότερο (#3)</option>
        </select>
        <select
          value={edited.cronExpression}
          onChange={(e) => setEdited({ ...edited, cronExpression: e.target.value })}
          className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
        >
          {cronPresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={edited.cronExpression}
        onChange={(e) => setEdited({ ...edited, cronExpression: e.target.value })}
        placeholder="0 0 * * *"
        className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
      />
      <div className="flex space-x-2">
        <button
          onClick={() => onSave(edited)}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
        >
          Αποθήκευση
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm"
        >
          Ακύρωση
        </button>
      </div>
    </div>
  );
};
