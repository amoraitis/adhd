import type { Goal, DailyEntry, RecurringPriority, RecommendedPriority } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5180/api';

export const api = {
  // Goals
  async getGoals(): Promise<Goal[]> {
    const response = await fetch(`${API_BASE_URL}/goals`);
    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  },

  async createGoal(goal: Omit<Goal, 'id' | 'created'>): Promise<Goal> {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!response.ok) throw new Error('Failed to create goal');
    return response.json();
  },

  async updateGoal(id: number, goal: Goal): Promise<Goal> {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!response.ok) throw new Error('Failed to update goal');
    return response.json();
  },

  async deleteGoal(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete goal');
  },

  // Steps
  async updateStep(id: number, step: { text: string; done: boolean }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/steps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(step),
    });
    if (!response.ok) throw new Error('Failed to update step');
  },

  // Daily entries
  async getDailyEntry(date: string): Promise<DailyEntry | null> {
    const response = await fetch(`${API_BASE_URL}/daily/${date}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch daily entry');
    return response.json();
  },

  async saveDailyEntry(entry: DailyEntry): Promise<DailyEntry> {
    const response = await fetch(`${API_BASE_URL}/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error('Failed to save daily entry');
    return response.json();
  },

  // Move priority to next available day
  async movePriorityToNextDay(priorityId: number): Promise<{ success: boolean; movedToDate: string }> {
    const response = await fetch(`${API_BASE_URL}/priorities/${priorityId}/move-to-next-day`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to move priority');
    }
    return response.json();
  },

  // Recurring priorities
  async getRecurringPriorities(): Promise<RecurringPriority[]> {
    const response = await fetch(`${API_BASE_URL}/recurring-priorities`);
    if (!response.ok) throw new Error('Failed to fetch recurring priorities');
    return response.json();
  },

  async createRecurringPriority(template: Omit<RecurringPriority, 'id' | 'createdAt'>): Promise<RecurringPriority> {
    const response = await fetch(`${API_BASE_URL}/recurring-priorities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!response.ok) throw new Error('Failed to create recurring priority');
    return response.json();
  },

  async updateRecurringPriority(id: number, template: RecurringPriority): Promise<RecurringPriority> {
    const response = await fetch(`${API_BASE_URL}/recurring-priorities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!response.ok) throw new Error('Failed to update recurring priority');
    return response.json();
  },

  async deleteRecurringPriority(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/recurring-priorities/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete recurring priority');
  },

  async toggleRecurringPriority(id: number): Promise<RecurringPriority> {
    const response = await fetch(`${API_BASE_URL}/recurring-priorities/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to toggle recurring priority');
    return response.json();
  },

  // AI Recommendations
  async getRecommendations(date: string): Promise<RecommendedPriority[]> {
    const response = await fetch(`${API_BASE_URL}/recommendations/${date}`);
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return response.json();
  },
};

