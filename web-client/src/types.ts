export interface Step {
  id?: number;
  text: string;
  done: boolean;
}

export interface Goal {
  id: number;
  title: string;
  type: 'short' | 'medium' | 'long';
  steps: Step[];
  created: string;
}

export interface Priority {
  id?: number;
  name: string;
  done: boolean;
  dailyEntryId?: number;
  importance: number; // 1 = most important, 2 = second, 3 = third
  recurringPriorityId?: number;
}

export interface RecurringPriority {
  id?: number;
  name: string;
  cronExpression: string; // Standard cron expression (e.g., "0 0 * * 1-5" for weekdays at midnight)
  isActive: boolean;
  importance: number; // 1 = most important, 2 = second, 3 = third (suggested)
  createdAt?: string;
}

export interface DailyEntry {
  id?: number;
  date: string;
  brainDump?: string;
  priorities: Priority[];
  worries?: string;
  worryTime?: string;
  gratitude?: string;
}

export interface RecommendedPriority {
  name: string;
  reason: string;
  suggestedImportance: number; // 1 = most important, 2 = second, 3 = third
  confidence: number; // 0.0 to 1.0
}
