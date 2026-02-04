import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, X, Calendar as CalendarIcon, List } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() + 1 
  });
  const [showMigration, setShowMigration] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    dayOfMonth: "",
    category: "",
  });
  const [activeSection, setActiveSection] = useState<'work' | 'cashflow'>('work');
  const [todoInput, setTodoInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showManageTransactions, setShowManageTransactions] = useState(false);

  const utils = trpc.useUtils();

  // Check for localStorage data on mount
  useEffect(() => {
    if (isAuthenticated) {
      const hasLocalData = 
        localStorage.getItem('projectionData') ||
        localStorage.getItem('recurringExpenses') ||
        localStorage.getItem('importedTransactions') ||
        localStorage.getItem('todoItems') ||
        localStorage.getItem('calendarItems');
      
      if (hasLocalData) {
        setShowMigration(true);
      }
    }
  }, [isAuthenticated]);

  // Fetch data from database
  const { data: dailyEntries, isLoading: loadingDaily } = trpc.dailyEntries.getByMonth.useQuery(
    currentMonth,
    { enabled: isAuthenticated }
  );

  const { data: recurringExpenses, isLoading: loadingExpenses } = trpc.recurringExpenses.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: transactions, isLoading: loadingTransactions } = trpc.transactions.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: todos, isLoading: loadingTodos } = trpc.todos.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: calendarItems, isLoading: loadingCalendar } = trpc.calendar.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Mutations
  const upsertDaily = trpc.dailyEntries.upsert.useMutation();
  const createExpense = trpc.recurringExpenses.create.useMutation({
    onSuccess: () => {
      utils.recurringExpenses.list.invalidate();
      toast.success("Expense added successfully!");
      setShowAddExpense(false);
      setNewExpense({ name: "", amount: "", dayOfMonth: "", category: "" });
    },
  });
  const deleteExpense = trpc.recurringExpenses.delete.useMutation({
    onSuccess: () => {
      utils.recurringExpenses.list.invalidate();
      toast.success("Expense deleted successfully!");
    },
  });
  const importTransactions = trpc.transactions.import.useMutation({
    onSuccess: (result) => {
      utils.transactions.list.invalidate();
      utils.dailyEntries.getByMonth.invalidate();
      let message = `✅ Import complete!\n${result.count} transactions added to ${result.datesProcessed} dates.`;
      if (result.excluded > 0) {
        message += `\n⚠️ ${result.excluded} internal transfers excluded.`;
      }
      if (result.skippedZero > 0) {
        message += `\n⚠️ ${result.skippedZero} zero-amount transactions skipped.`;
      }
      toast.success(message);
      setShowImportCSV(false);
      setParsedTransactions([]);
      setCsvFile(null);
    },
  });
  const deleteTransaction = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      toast.success("Transaction deleted!");
    },
  });
  const clearTransactions = trpc.transactions.clear.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      toast.success("All transactions cleared!");
      setShowManageTransactions(false);
    },
  });
  const migrateMutation = trpc.migration.migrate.useMutation();
  const createTodo = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      setTodoInput("");
      toast.success("Todo added!");
    },
  });
  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });
  const deleteTodo = trpc.todos.delete.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      toast.success("Todo deleted!");
    },
  });

  const parseCSV = (text: string): ParsedTransaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions: ParsedTransaction[] = [];

    // Find column indices
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const descIndex = headers.findIndex(h => h.includes('description') || h.includes('name') || h.includes('memo'));
    const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('value'));
    const moneyInIndex = headers.findIndex(h => h.includes('money in'));
    const moneyOutIndex = headers.findIndex(h => h.includes('money out'));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (dateIndex === -1) continue;

      let amount = 0;
      if (moneyInIndex !== -1 && moneyOutIndex !== -1) {
        const moneyIn = parseFloat(values[moneyInIndex] || '0');
        const moneyOut = parseFloat(values[moneyOutIndex] || '0');
        // Monzo CSV: Money Out is already negative, Money In is positive
        // So we add them together (not subtract)
        amount = moneyIn + moneyOut;
      } else if (amountIndex !== -1) {
        amount = parseFloat(values[amountIndex] || '0');
      }

      if (isNaN(amount)) continue;

      const dateStr = values[dateIndex];
      let parsedDate: Date | null = null;

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else if (dateStr.match(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/)) {
        parsedDate = new Date(dateStr);
      } else {
        parsedDate = new Date(dateStr);
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) continue;

      transactions.push({
        date: parsedDate.toISOString().split('T')[0],
        description: descIndex !== -1 ? values[descIndex] : '',
        amount: amount,
        category: undefined,
      });
    }

    return transactions;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('No valid transactions found in CSV file');
        return;
      }
      setParsedTransactions(parsed);
      toast.success(`Parsed ${parsed.length} transactions`);
    };
    reader.readAsText(file);
  };

  const handleImportTransactions = async () => {
    if (parsedTransactions.length === 0) {
      toast.error('No transactions to import');
      return;
    }

    await importTransactions.mutateAsync({
      transactions: parsedTransactions,
    });
  };

  const handleMigration = async () => {
    try {
      const projectionData = JSON.parse(localStorage.getItem('projectionData') || '{}');
      const recurringExpenses = JSON.parse(localStorage.getItem('recurringExpenses') || '[]');
      const importedTransactions = JSON.parse(localStorage.getItem('importedTransactions') || '[]');
      const todoItems = JSON.parse(localStorage.getItem('todoItems') || '[]');
      const calendarItems = JSON.parse(localStorage.getItem('calendarItems') || '[]');

      const result = await migrateMutation.mutateAsync({
        dailyEntries: projectionData,
        recurringExpenses: recurringExpenses.map((e: any) => ({
          name: e.name,
          amount: parseFloat(e.amount) || 0,
          dayOfMonth: parseInt(e.dayOfMonth) || 1,
          category: e.category,
        })),
        importedTransactions: importedTransactions.map((t: any) => ({
          date: t.date,
          description: t.description,
          amount: parseFloat(t.amount) || 0,
          category: t.category,
          source: t.source,
        })),
        todoItems: todoItems.map((item: any) => ({
          text: item.text || item.task || '',
          completed: item.completed || false,
        })),
        calendarItems: Object.entries(calendarItems).flatMap(([date, items]: [string, any]) => 
          (Array.isArray(items) ? items : [items]).map((item: any) => ({
            title: item.title || item.name || 'Untitled',
            date: date,
            amount: item.amount ? parseFloat(item.amount) : undefined,
            type: item.type || 'reminder',
            description: item.description,
          }))
        ),
      });

      toast.success(result.message);
      setShowMigration(false);

      localStorage.removeItem('projectionData');
      localStorage.removeItem('recurringExpenses');
      localStorage.removeItem('importedTransactions');
      localStorage.removeItem('todoItems');
      localStorage.removeItem('calendarItems');
    } catch (error) {
      toast.error('Migration failed. Please try again.');
      console.error('Migration error:', error);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.dayOfMonth) {
      toast.error("Please fill in all required fields");
      return;
    }

    await createExpense.mutateAsync({
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      dayOfMonth: parseInt(newExpense.dayOfMonth),
      category: newExpense.category || undefined,
    });
  };

  const handleImportCSV = () => {
    setShowImportCSV(true);
    setParsedTransactions([]);
    setCsvFile(null);
  };

  const handleReviewExpenses = () => {
    setShowManageTransactions(true);
  };

  const handleAnalysis = () => {
    toast.info("Analysis dashboard coming soon! You'll see charts and insights about your income and expenses.");
  };

  const handleExport = () => {
    if (!dailyEntries || dailyEntries.length === 0) {
      toast.error("No data to export for this month");
      return;
    }

    const headers = ["Date", "Day", "Uber", "Bolt", "FreeNow", "Horizon Cars", "Other", "Total Income", "Expenses", "Balance", "Notes"];
    const rows = dailyEntries.map(entry => {
      const totalIncome = parseFloat(entry.uber) + parseFloat(entry.bolt) + 
                        parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + 
                        parseFloat(entry.other);
      const date = new Date(entry.date);
      return [
        date.toLocaleDateString('en-CA'),
        date.toLocaleDateString('en-US', { weekday: 'short' }),
        parseFloat(entry.uber).toFixed(2),
        parseFloat(entry.bolt).toFixed(2),
        parseFloat(entry.freenow).toFixed(2),
        parseFloat(entry.horizoncars).toFixed(2),
        parseFloat(entry.other).toFixed(2),
        totalIncome.toFixed(2),
        parseFloat(entry.expenses).toFixed(2),
        parseFloat(entry.balance).toFixed(2),
        entry.notes || '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully!");
  };

  const handleAddTodo = async () => {
    if (!todoInput.trim()) return;
    await createTodo.mutateAsync({ text: todoInput.trim() });
  };

  const previousMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const calculateSummary = () => {
    const plannedIncome = 6000;
    const actualIncome = dailyEntries?.reduce((sum, entry) => {
      const total = parseFloat(entry.uber) + parseFloat(entry.bolt) + 
                    parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + 
                    parseFloat(entry.other);
      return sum + total;
    }, 0) || 0;

    const plannedExpenses = recurringExpenses?.reduce((sum, exp) => 
      sum + parseFloat(exp.amount), 0) || 0;

    const actualExpenses = dailyEntries?.reduce((sum, entry) => 
      sum + parseFloat(entry.expenses), 0) || 0;

    return {
      plannedIncome,
      actualIncome,
      plannedExpenses,
      actualExpenses,
      netPosition: actualIncome - actualExpenses,
      variance: actualIncome - plannedIncome,
    };
  };

  const renderCalendarView = () => {
    const { year, month } = currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Check for recurring expenses on this day
      const recurringForDay = recurringExpenses?.filter(exp => exp.dayOfMonth === day) || [];
      const recurringTotal = recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      
      // Get bank transactions for this day
      const dayTransactions = transactions?.filter(t => t.date.startsWith(date)) || [];
      
      // Calculate balance from bank transactions only
      const transactionBalance = dayTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
      const totalExpenses = recurringTotal;
      const balance = transactionBalance - totalExpenses;

      calendarDays.push(
        <div 
          key={day} 
          onClick={() => {
            setSelectedDate(date);
            setShowDayDetail(true);
          }}
          className={`p-2 border rounded-lg min-h-[100px] cursor-pointer hover:ring-2 hover:ring-indigo-400 transition ${balance > 0 ? 'bg-green-50' : balance < 0 ? 'bg-red-50' : 'bg-gray-50'}`}
        >
          <div className="font-bold text-sm mb-1">{day}</div>
          {recurringForDay.length > 0 && (
            <div className="text-xs text-orange-600 font-semibold">
              {recurringForDay.map(exp => (
                <div key={exp.id}>📌 {exp.name} -£{parseFloat(exp.amount).toFixed(2)}</div>
              ))}
            </div>
          )}
          {dayTransactions.length > 0 && (
            <div className="text-[10px] space-y-0.5 mt-1 max-h-16 overflow-y-auto">
              {dayTransactions.map(txn => (
                <div key={txn.id} className={`${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'} leading-tight`}>
                  🏦 {parseFloat(txn.amount) >= 0 ? '+' : ''}£{Math.abs(parseFloat(txn.amount)).toFixed(0)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-bold text-center p-2">{day}</div>
        ))}
        {calendarDays}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700 p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">💰 CashFlow Pro</h1>
          <p className="text-gray-600 mb-6">
            Track your income and expenses across all your devices. Sign in to get started.
          </p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <a href="/api/dev-login">Dev Login (Testing)</a>
          </Button>
        </Card>
      </div>
    );
  }

  const isLoading = loadingDaily || loadingExpenses || loadingTransactions || loadingTodos || loadingCalendar;
  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700 p-1 sm:p-2 md:p-4">
      <div className="max-w-7xl mx-auto mr-0 lg:mr-[340px]">
        {/* Header */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-4 md:p-6 mb-2 sm:mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-600">💰 Cash Flow Calendar</h1>
            <div className="flex flex-wrap gap-1 sm:gap-2 items-center text-xs sm:text-sm">
              <Button size="sm" variant="secondary" onClick={previousMonth}>← Prev</Button>
              <span className="font-semibold min-w-[140px] text-center">
                {getMonthName(currentMonth.month)} {currentMonth.year}
              </span>
              <Button size="sm" variant="secondary" onClick={nextMonth}>Next →</Button>
              <Button size="sm" variant="default" onClick={handleImportCSV}>📤 Import CSV</Button>
              <Button size="sm" variant="default" onClick={handleReviewExpenses}>🏷️ Review</Button>
              <Button size="sm" style={{ background: '#8b5cf6' }} onClick={handleAnalysis}>📊 Analysis</Button>
              <Button size="sm" variant="default" onClick={handleExport}>📥 Export</Button>
            </div>
          </div>
        </div>

        {/* Migration Banner */}
        {showMigration && (
          <Card className="p-3 sm:p-4 md:p-6 mb-2 sm:mb-4 md:mb-6 border-l-4 border-green-500 bg-green-50">
            <h3 className="font-bold text-lg mb-2">📦 Local Data Detected</h3>
            <p className="text-gray-700 mb-4">
              We found existing data in your browser. Would you like to migrate it to your account so you can access it from any device?
            </p>
            <div className="flex gap-2">
              <Button onClick={handleMigration} disabled={migrateMutation.isPending}>
                {migrateMutation.isPending ? 'Migrating...' : 'Migrate Data'}
              </Button>
              <Button variant="outline" onClick={() => setShowMigration(false)}>
                Skip for Now
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-2 sm:mb-4 md:mb-6">
              <Card className="p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">📊 Monthly Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Planned Income</span>
                    <span className="font-semibold">£{summary.plannedIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Income</span>
                    <span className="font-semibold text-green-600">£{summary.actualIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Planned Expenses</span>
                    <span className="font-semibold">£{summary.plannedExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Expenses</span>
                    <span className="font-semibold text-red-600">£{summary.actualExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-bold">Net Position</span>
                    <span className={`font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      £{summary.netPosition.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">💰 Recurring Expenses</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recurringExpenses?.map(expense => (
                    <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{expense.name}</div>
                        <div className="text-sm text-gray-500">Day {expense.dayOfMonth}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">£{parseFloat(expense.amount).toFixed(2)}</span>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteExpense.mutate({ id: expense.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full mt-2" variant="outline" onClick={() => setShowAddExpense(true)}>
                    + Add Expense
                  </Button>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">📈 Forecasting & Insights</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Worked</span>
                    <span className="font-semibold">{dailyEntries?.length || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Daily Income</span>
                    <span className="font-semibold">
                      £{dailyEntries?.length ? (summary.actualIncome / dailyEntries.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">On Track?</span>
                    <span className={summary.variance >= 0 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                      {summary.variance >= 0 ? '✅ On Target' : '⚠️ Below Target'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* View Toggle */}
            <div className="mb-2 sm:mb-4 flex gap-1 sm:gap-2">
              <Button 
                variant={activeSection === 'work' ? 'default' : 'outline'}
                onClick={() => setActiveSection('work')}
              >
                <List className="mr-1 h-4 w-4" />
                Work Tracker
              </Button>
              <Button 
                variant={activeSection === 'cashflow' ? 'default' : 'outline'}
                onClick={() => setActiveSection('cashflow')}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                Cash Flow
              </Button>
            </div>

            {/* Data Display */}
            {activeSection === 'work' ? (
              <Card className="overflow-x-auto">
                {/* Work Tracker - Table View */}
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Day</th>
                      <th className="p-3 text-left font-semibold">Uber</th>
                      <th className="p-3 text-left font-semibold">Bolt</th>
                      <th className="p-3 text-left font-semibold">FreeNow</th>
                      <th className="p-3 text-left font-semibold">Horizon Cars</th>
                      <th className="p-3 text-left font-semibold">Other</th>
                      <th className="p-3 text-left font-semibold">Total Income</th>
                      <th className="p-3 text-left font-semibold">Expenses</th>
                      <th className="p-3 text-left font-semibold">Balance</th>
                      <th className="p-3 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyEntries && dailyEntries.length > 0 ? (
                      dailyEntries.map(entry => {
                        const totalIncome = parseFloat(entry.uber) + parseFloat(entry.bolt) + 
                                          parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + 
                                          parseFloat(entry.other);
                        return (
                          <tr 
                            key={entry.id} 
                            onClick={() => {
                              setSelectedDate(new Date(entry.date).toISOString().split('T')[0]);
                              setShowDayDetail(true);
                            }}
                            className="border-b hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="p-3">{new Date(entry.date).toLocaleDateString('en-CA')}</td>
                            <td className="p-3">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                            <td className="p-3 text-green-600">£{parseFloat(entry.uber).toFixed(2)}</td>
                            <td className="p-3 text-green-600">£{parseFloat(entry.bolt).toFixed(2)}</td>
                            <td className="p-3 text-green-600">£{parseFloat(entry.freenow).toFixed(2)}</td>
                            <td className="p-3 text-green-600">£{parseFloat(entry.horizoncars).toFixed(2)}</td>
                            <td className="p-3 text-green-600">£{parseFloat(entry.other).toFixed(2)}</td>
                            <td className="p-3 font-semibold text-green-600">£{totalIncome.toFixed(2)}</td>
                            <td className="p-3 text-red-600">£{parseFloat(entry.expenses).toFixed(2)}</td>
                            <td className="p-3 font-semibold">£{parseFloat(entry.balance).toFixed(2)}</td>
                            <td className="p-3 text-gray-600 text-sm">{entry.notes || '—'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">
                          No entries for this month. Start adding your income and expenses!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="p-2 sm:p-4 md:p-6">
                {/* Cash Flow - Calendar View */}
                {renderCalendarView()}
              </Card>
            )}
          </>
        )}
      </div>

      {/* Todo Sidebar */}
      <div className="hidden lg:flex fixed right-0 top-0 bottom-0 w-[320px] bg-white border-l shadow-lg flex-col z-50">
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600">
          <h3 className="text-white font-semibold text-lg">📋 To-Do List</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {todos && todos.length > 0 ? (
            todos.map(todo => (
              <div 
                key={todo.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  todo.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-200'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={todo.completed}
                  onChange={() => updateTodo.mutate({ id: todo.id, completed: !todo.completed })}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {todo.text}
                </span>
                <button 
                  onClick={() => deleteTodo.mutate({ id: todo.id })}
                  className="text-red-500 hover:text-red-700 font-bold text-xl"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">No tasks yet</div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Input 
            placeholder="Add a task..."
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <Button onClick={handleAddTodo} disabled={createTodo.isPending}>
            +
          </Button>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recurring Expense</DialogTitle>
            <DialogDescription>
              Add a new recurring expense that will appear every month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Expense Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Rent, Insurance"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (£) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="day">Day of Month (1-31) *</Label>
              <Input
                id="day"
                type="number"
                min="1"
                max="31"
                placeholder="15"
                value={newExpense.dayOfMonth}
                onChange={(e) => setNewExpense({ ...newExpense, dayOfMonth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Housing, Transportation"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpense(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showImportCSV} onOpenChange={setShowImportCSV}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV Transactions</DialogTitle>
            <DialogDescription>
              Upload a CSV file from your bank to import transactions. Supports Monzo, NatWest, Barclays, and other standard formats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!csvFile ? (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Select CSV File
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      or drag and drop your CSV file here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">{csvFile.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCsvFile(null);
                        setParsedTransactions([]);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-green-600">
                    ✓ {parsedTransactions.length} transactions parsed
                  </p>
                </div>
              )}
            </div>

            {parsedTransactions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Preview ({parsedTransactions.length} transactions)</h3>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTransactions.slice(0, 10).map((txn, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{txn.date}</td>
                          <td className="p-2">{txn.description}</td>
                          <td className={`p-2 text-right font-medium ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            £{txn.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedTransactions.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {parsedTransactions.length - 10} more transactions
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportCSV(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportTransactions} 
              disabled={parsedTransactions.length === 0 || importTransactions.isPending}
            >
              {importTransactions.isPending ? 'Importing...' : `Import ${parsedTransactions.length} Transactions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Details - {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </DialogTitle>
            <DialogDescription>
              Complete breakdown of income, expenses, and transactions for this day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(() => {
              if (!selectedDate) return null;
              
              const entry = dailyEntries?.find(e => new Date(e.date).toISOString().startsWith(selectedDate));
              const dayTransactions = transactions?.filter(t => t.date.startsWith(selectedDate)) || [];
              const day = parseInt(selectedDate.split('-')[2]);
              const recurringForDay = recurringExpenses?.filter(exp => exp.dayOfMonth === day) || [];
              
              return (
                <>
                  {/* Show manual income only in work tracker */}
                  {activeSection === 'work' && entry && (
                    <div className="border rounded-lg p-4 bg-green-50">
                      <h3 className="font-bold text-lg mb-3 text-green-700">💰 Work Income (Manual Tracking)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Uber</span>
                          <span className="font-semibold text-green-600">£{parseFloat(entry.uber).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bolt</span>
                          <span className="font-semibold text-green-600">£{parseFloat(entry.bolt).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>FreeNow</span>
                          <span className="font-semibold text-green-600">£{parseFloat(entry.freenow).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horizon Cars</span>
                          <span className="font-semibold text-green-600">£{parseFloat(entry.horizoncars).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other</span>
                          <span className="font-semibold text-green-600">£{parseFloat(entry.other).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="font-bold">Total Income</span>
                          <span className="font-bold text-green-600">
                            £{(parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)).toFixed(2)}
                          </span>
                        </div>
                        {entry.notes && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <div className="text-xs text-gray-500">Notes</div>
                            <div className="text-sm">{entry.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expenses Section */}
                  <div className="border rounded-lg p-4 bg-red-50">
                    <h3 className="font-bold text-lg mb-3 text-red-700">💸 Expenses</h3>
                    <div className="space-y-2">
                      {activeSection === 'work' && entry && parseFloat(entry.expenses) > 0 && (
                        <div className="flex justify-between">
                          <span>Daily Expenses (Manual)</span>
                          <span className="font-semibold text-red-600">£{parseFloat(entry.expenses).toFixed(2)}</span>
                        </div>
                      )}
                      {recurringForDay.length > 0 && (
                        <>
                          {recurringForDay.map(exp => (
                            <div key={exp.id} className="flex justify-between">
                              <span>📌 {exp.name} {exp.category && `(${exp.category})`}</span>
                              <span className="font-semibold text-orange-600">£{parseFloat(exp.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {(!entry || parseFloat(entry.expenses) === 0) && recurringForDay.length === 0 && (
                        <p className="text-gray-500">No expenses for this day</p>
                      )}
                    </div>
                  </div>

                  {/* Bank Transactions Section */}
                  {dayTransactions.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h3 className="font-bold text-lg mb-3 text-blue-700">🏦 Imported Bank Transactions</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayTransactions.map(txn => (
                          <div key={txn.id} className="flex justify-between items-start p-2 bg-white rounded border">
                            <div className="flex-1">
                              <div className="font-medium">{txn.description}</div>
                              {txn.category && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Category: {txn.category}
                                </div>
                              )}
                              {txn.source && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Source: {txn.source}
                                </div>
                              )}
                            </div>
                            <div className={`font-semibold ml-4 ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(txn.amount) >= 0 ? '+' : ''}£{Math.abs(parseFloat(txn.amount)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="border-2 rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h3 className="font-bold text-lg mb-3">📊 Daily Summary</h3>
                    <div className="space-y-2">
                      {activeSection === 'cashflow' ? (
                        <>
                          <div className="flex justify-between">
                            <span>Bank Transactions</span>
                            <span className={`font-semibold ${dayTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              £{dayTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recurring Expenses</span>
                            <span className="font-semibold text-red-600">
                              £{recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-bold text-lg">Net Cash Flow</span>
                            <span className={`font-bold text-lg ${
                              dayTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0) - recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) >= 0 
                              ? 'text-green-600' : 'text-red-600'
                            }`}>
                              £{(dayTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0) - recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)).toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>Work Income</span>
                            <span className="font-semibold text-green-600">
                              £{entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)).toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Daily Expenses</span>
                            <span className="font-semibold text-red-600">
                              £{entry ? parseFloat(entry.expenses).toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-bold text-lg">Net Earnings</span>
                            <span className={`font-bold text-lg ${
                              (entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other) - parseFloat(entry.expenses)) : 0) >= 0 
                              ? 'text-green-600' : 'text-red-600'
                            }`}>
                              £{(entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other) - parseFloat(entry.expenses)) : 0).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDayDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Transactions Dialog */}
      <Dialog open={showManageTransactions} onOpenChange={setShowManageTransactions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🏦 Manage Imported Transactions</DialogTitle>
            <DialogDescription>
              Review, edit, or delete imported bank transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {transactions && transactions.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">{transactions.length} transactions</p>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Delete all imported transactions? This cannot be undone.')) {
                        clearTransactions.mutate();
                      }
                    }}
                    disabled={clearTransactions.isPending}
                  >
                    {clearTransactions.isPending ? 'Deleting...' : 'Clear All'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {transactions.map((txn: any) => (
                    <div key={txn.id} className="border rounded-lg p-3 flex justify-between items-start hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{txn.description}</span>
                          <span className={`text-sm px-2 py-0.5 rounded ${parseFloat(txn.amount) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {txn.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(txn.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(txn.amount) >= 0 ? '+' : ''}£{Math.abs(parseFloat(txn.amount)).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this transaction?')) {
                              deleteTransaction.mutate({ id: txn.id });
                            }
                          }}
                          disabled={deleteTransaction.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">No transactions imported yet</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowManageTransactions(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
