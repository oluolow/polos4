import { COOKIE_NAME } from "@shared/const";
import { smartClassifier } from "./smartClassifier";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Daily Entries
  dailyEntries: router({
    getByMonth: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ ctx, input }) => {
        return db.getDailyEntriesByMonth(ctx.user.id, input.year, input.month);
      }),

    upsert: protectedProcedure
      .input(z.object({
        date: z.string(), // YYYY-MM-DD
        uber: z.number().default(0),
        bolt: z.number().default(0),
        freenow: z.number().default(0),
        horizoncars: z.number().default(0),
        other: z.number().default(0),
        expenses: z.number().default(0),
        balance: z.number().default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertDailyEntry({
          userId: ctx.user.id,
          date: new Date(input.date),
          uber: input.uber.toString(),
          bolt: input.bolt.toString(),
          freenow: input.freenow.toString(),
          horizoncars: input.horizoncars.toString(),
          other: input.other.toString(),
          expenses: input.expenses.toString(),
          balance: input.balance.toString(),
          notes: input.notes,
        });
        return { success: true };
      }),
  }),

  // Recurring Expenses
  recurringExpenses: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getRecurringExpenses(ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        amount: z.number(),
        dayOfMonth: z.number().min(1).max(31),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createRecurringExpense({
          userId: ctx.user.id,
          name: input.name,
          amount: input.amount.toString(),
          dayOfMonth: input.dayOfMonth,
          category: input.category,
        });
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteRecurringExpense(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  // Imported Transactions
  transactions: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getImportedTransactions(ctx.user.id);
      }),

    import: protectedProcedure
      .input(z.object({
        transactions: z.array(z.object({
          date: z.string(),
          description: z.string(),
          amount: z.number(),
          category: z.string().optional(),
          source: z.string().optional(),
          verified: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Filter and classify transactions using smart classifier
        const validTransactions: Array<{
          date: string;
          description: string;
          amount: number;
          category: string;
        }> = [];
        
        let excluded = 0;
        let skippedZero = 0;

        input.transactions.forEach(trans => {
          // Classify the transaction
          const classification = smartClassifier.classifyTransaction(trans.description, trans.amount);
          
          // Skip excluded transactions (internal transfers)
          if (classification.type === 'exclude') {
            excluded++;
            return;
          }
          
          // Fix amount based on classification
          const fixedAmount = smartClassifier.fixAmount(trans.amount, classification);
          
          // Skip zero amounts
          if (fixedAmount === 0) {
            skippedZero++;
            return;
          }
          
          // Determine category for income
          let category = 'expense';
          if (classification.type === 'income') {
            category = smartClassifier.categorizeIncome(trans.description);
          }
          
          validTransactions.push({
            date: trans.date,
            description: trans.description,
            amount: fixedAmount,
            category,
          });
        });

        // Group transactions by date and aggregate
        const dateMap: Record<string, {
          uber: number;
          bolt: number;
          freenow: number;
          horizoncars: number;
          other: number;
          expenses: number;
        }> = {};

        validTransactions.forEach(trans => {
          const date = trans.date;

          if (!dateMap[date]) {
            dateMap[date] = {
              uber: 0,
              bolt: 0,
              freenow: 0,
              horizoncars: 0,
              other: 0,
              expenses: 0,
            };
          }

          if (trans.category === 'uber') {
            dateMap[date].uber += trans.amount;
          } else if (trans.category === 'bolt') {
            dateMap[date].bolt += trans.amount;
          } else if (trans.category === 'freenow') {
            dateMap[date].freenow += trans.amount;
          } else if (trans.category === 'horizoncars') {
            dateMap[date].horizoncars += trans.amount;
          } else if (trans.category === 'other' && trans.amount > 0) {
            dateMap[date].other += trans.amount;
          } else if (trans.category === 'expense') {
            dateMap[date].expenses += Math.abs(trans.amount);
          }
        });

        // Save valid transactions to database
        const dbTransactions = validTransactions.map(t => ({
          userId: ctx.user.id,
          date: new Date(t.date),
          description: t.description,
          amount: t.amount.toString(),
          category: t.category,
          source: input.transactions[0]?.source,
          verified: false,
        }));
        await db.createImportedTransactions(dbTransactions);

        // Create or update daily entries from aggregated data
        for (const [date, values] of Object.entries(dateMap)) {
          const totalIncome = values.uber + values.bolt + values.freenow + values.horizoncars + values.other;
          await db.upsertDailyEntry({
            userId: ctx.user.id,
            date: new Date(date),
            uber: values.uber.toString(),
            bolt: values.bolt.toString(),
            freenow: values.freenow.toString(),
            horizoncars: values.horizoncars.toString(),
            other: values.other.toString(),
            expenses: values.expenses.toString(),
            balance: (totalIncome - values.expenses).toString(),
            notes: undefined,
          });
        }

        return { 
          success: true, 
          count: validTransactions.length, 
          datesProcessed: Object.keys(dateMap).length,
          excluded,
          skippedZero,
        };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteImportedTransaction(ctx.user.id, input.id);
        return { success: true };
      }),

    clear: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.deleteImportedTransactions(ctx.user.id);
        return { success: true };
      }),
  }),

  // Todo Items
  todos: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getTodoItems(ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        text: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createTodoItem({
          userId: ctx.user.id,
          text: input.text,
          completed: false,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().optional(),
        completed: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateTodoItem(ctx.user.id, id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTodoItem(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  // Calendar Items
  calendar: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getCalendarItems(ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        date: z.string(),
        amount: z.number().optional(),
        type: z.enum(["income", "expense", "reminder"]),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCalendarItem({
          userId: ctx.user.id,
          title: input.title,
          date: new Date(input.date),
          amount: input.amount?.toString(),
          type: input.type,
          description: input.description,
        });
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCalendarItem(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  // Data Migration - helps users migrate from localStorage to database
  migration: router({
    migrate: protectedProcedure
      .input(z.object({
        dailyEntries: z.record(z.string(), z.object({
          uber: z.number().default(0),
          bolt: z.number().default(0),
          freenow: z.number().default(0),
          horizoncars: z.number().default(0),
          other: z.number().default(0),
          expenses: z.number().default(0),
          balance: z.number().default(0),
          notes: z.string().optional(),
        })).optional(),
        recurringExpenses: z.array(z.object({
          name: z.string(),
          amount: z.number(),
          dayOfMonth: z.number(),
          category: z.string().optional(),
        })).optional(),
        importedTransactions: z.array(z.object({
          date: z.string(),
          description: z.string().optional(),
          amount: z.number(),
          category: z.string().optional(),
          source: z.string().optional(),
        })).optional(),
        todoItems: z.array(z.object({
          text: z.string(),
          completed: z.boolean().default(false),
        })).optional(),
        calendarItems: z.array(z.object({
          title: z.string(),
          date: z.string(),
          amount: z.number().optional(),
          type: z.enum(["income", "expense", "reminder"]),
          description: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let migratedCount = 0;

        // Migrate daily entries
        if (input.dailyEntries) {
          for (const [date, entry] of Object.entries(input.dailyEntries)) {
            await db.upsertDailyEntry({
              userId: ctx.user.id,
              date: new Date(date),
              uber: entry.uber.toString(),
              bolt: entry.bolt.toString(),
              freenow: entry.freenow.toString(),
              horizoncars: entry.horizoncars.toString(),
              other: entry.other.toString(),
              expenses: entry.expenses.toString(),
              balance: entry.balance.toString(),
              notes: entry.notes,
            });
            migratedCount++;
          }
        }

        // Migrate recurring expenses
        if (input.recurringExpenses) {
          for (const expense of input.recurringExpenses) {
            await db.createRecurringExpense({
              userId: ctx.user.id,
              name: expense.name,
              amount: expense.amount.toString(),
              dayOfMonth: expense.dayOfMonth,
              category: expense.category,
            });
            migratedCount++;
          }
        }

        // Migrate imported transactions
        if (input.importedTransactions && input.importedTransactions.length > 0) {
          const transactions = input.importedTransactions.map(t => ({
            userId: ctx.user.id,
            date: new Date(t.date),
            description: t.description,
            amount: t.amount.toString(),
            category: t.category,
            source: t.source,
            verified: false,
          }));
          await db.createImportedTransactions(transactions);
          migratedCount += transactions.length;
        }

        // Migrate todo items
        if (input.todoItems) {
          for (const item of input.todoItems) {
            await db.createTodoItem({
              userId: ctx.user.id,
              text: item.text,
              completed: item.completed,
            });
            migratedCount++;
          }
        }

        // Migrate calendar items
        if (input.calendarItems) {
          for (const item of input.calendarItems) {
            await db.createCalendarItem({
              userId: ctx.user.id,
              title: item.title,
              date: new Date(item.date),
              amount: item.amount?.toString(),
              type: item.type,
              description: item.description,
            });
            migratedCount++;
          }
        }

        return { 
          success: true, 
          migratedCount,
          message: `Successfully migrated ${migratedCount} items to your account` 
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
