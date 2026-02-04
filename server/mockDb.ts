// Mock in-memory database for testing without MySQL
import type { User, DailyEntry, RecurringExpense, ImportedTransaction, TodoItem, CalendarItem } from "../drizzle/schema";

const mockData = {
  users: new Map<string, User>(),
  dailyEntries: new Map<number, DailyEntry>(),
  recurringExpenses: new Map<number, RecurringExpense>(),
  transactions: new Map<number, ImportedTransaction>(),
  todos: new Map<number, TodoItem>(),
  calendar: new Map<number, CalendarItem>(),
  nextId: {
    user: 1,
    dailyEntry: 1,
    recurringExpense: 1,
    transaction: 1,
    todo: 1,
    calendar: 1,
  }
};

export const mockDb = {
  async getUserByOpenId(openId: string): Promise<User | undefined> {
    return Array.from(mockData.users.values()).find(u => u.openId === openId);
  },

  async upsertUser(data: Partial<User> & { openId: string }): Promise<void> {
    const existing = await this.getUserByOpenId(data.openId);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      mockData.users.set(data.openId, updated);
    } else {
      const newUser: User = {
        id: mockData.nextId.user++,
        openId: data.openId,
        name: data.name || null,
        email: data.email || null,
        loginMethod: data.loginMethod || null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: data.lastSignedIn || new Date(),
      };
      mockData.users.set(data.openId, newUser);
    }
  },

  async getDailyEntriesByMonth(userId: number, year: number, month: number): Promise<DailyEntry[]> {
    return Array.from(mockData.dailyEntries.values())
      .filter(e => {
        if (e.userId !== userId) return false;
        const date = new Date(e.date);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async upsertDailyEntry(data: Omit<DailyEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const existing = Array.from(mockData.dailyEntries.values())
      .find(e => e.userId === data.userId && e.date === data.date);
    
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      mockData.dailyEntries.set(existing.id, updated);
    } else {
      const newEntry: DailyEntry = {
        ...data,
        id: mockData.nextId.dailyEntry++,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.dailyEntries.set(newEntry.id, newEntry);
    }
  },

  async getRecurringExpenses(userId: number): Promise<RecurringExpense[]> {
    return Array.from(mockData.recurringExpenses.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  },

  async createRecurringExpense(data: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringExpense> {
    const newExpense: RecurringExpense = {
      ...data,
      id: mockData.nextId.recurringExpense++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockData.recurringExpenses.set(newExpense.id, newExpense);
    return newExpense;
  },

  async deleteRecurringExpense(userId: number, id: number): Promise<void> {
    const expense = mockData.recurringExpenses.get(id);
    if (expense && expense.userId === userId) {
      mockData.recurringExpenses.delete(id);
    }
  },

  async getImportedTransactions(userId: number): Promise<ImportedTransaction[]> {
    return Array.from(mockData.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createImportedTransactions(data: Array<Omit<ImportedTransaction, 'id' | 'createdAt'>>): Promise<void> {
    for (const txn of data) {
      const newTxn: ImportedTransaction = {
        ...txn,
        id: mockData.nextId.transaction++,
        createdAt: new Date(),
      };
      mockData.transactions.set(newTxn.id, newTxn);
    }
  },

  async deleteImportedTransactions(userId: number): Promise<void> {
    for (const [id, txn] of mockData.transactions.entries()) {
      if (txn.userId === userId) {
        mockData.transactions.delete(id);
      }
    }
  },

  async getTodoItems(userId: number): Promise<TodoItem[]> {
    return Array.from(mockData.todos.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async createTodoItem(data: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoItem> {
    const newTodo: TodoItem = {
      ...data,
      id: mockData.nextId.todo++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockData.todos.set(newTodo.id, newTodo);
    return newTodo;
  },

  async updateTodoItem(userId: number, id: number, data: Partial<Omit<TodoItem, 'id' | 'userId'>>): Promise<void> {
    const todo = mockData.todos.get(id);
    if (todo && todo.userId === userId) {
      const updated = { ...todo, ...data, updatedAt: new Date() };
      mockData.todos.set(id, updated);
    }
  },

  async deleteTodoItem(userId: number, id: number): Promise<void> {
    const todo = mockData.todos.get(id);
    if (todo && todo.userId === userId) {
      mockData.todos.delete(id);
    }
  },

  async getCalendarItems(userId: number): Promise<CalendarItem[]> {
    return Array.from(mockData.calendar.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async createCalendarItem(data: Omit<CalendarItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarItem> {
    const newItem: CalendarItem = {
      ...data,
      id: mockData.nextId.calendar++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockData.calendar.set(newItem.id, newItem);
    return newItem;
  },

  async deleteCalendarItem(userId: number, id: number): Promise<void> {
    const item = mockData.calendar.get(id);
    if (item && item.userId === userId) {
      mockData.calendar.delete(id);
    }
  },
};
