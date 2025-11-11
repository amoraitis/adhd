export interface Step {
  id: number;
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
