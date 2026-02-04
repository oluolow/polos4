import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("dailyEntries", () => {
  it("should upsert a daily entry successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dailyEntries.upsert({
      date: "2026-02-03",
      uber: 150.50,
      bolt: 75.25,
      freenow: 50.00,
      horizoncars: 100.00,
      other: 25.00,
      expenses: 50.00,
      balance: 350.75,
      notes: "Test entry",
    });

    expect(result).toEqual({ success: true });
  });

  it("should retrieve daily entries by month", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Retrieve entries for a month
    const entries = await caller.dailyEntries.getByMonth({
      year: 2026,
      month: 2,
    });

    // Should return an array (may be empty if no data exists)
    expect(Array.isArray(entries)).toBe(true);
  });
});

describe("recurringExpenses", () => {
  it("should create a recurring expense", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const expense = await caller.recurringExpenses.create({
      name: "Test Rent",
      amount: 700,
      dayOfMonth: 15,
      category: "Housing",
    });

    expect(expense).toBeDefined();
    expect(expense.name).toBe("Test Rent");
    expect(parseFloat(expense.amount)).toBe(700);
  });

  it("should list all recurring expenses for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const expenses = await caller.recurringExpenses.list();

    expect(Array.isArray(expenses)).toBe(true);
  });
});

describe("migration", () => {
  it("should migrate localStorage data to database", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.migration.migrate({
      dailyEntries: {
        "2026-02-01": {
          uber: 100,
          bolt: 50,
          freenow: 25,
          horizoncars: 75,
          other: 10,
          expenses: 30,
          balance: 230,
          notes: "Migrated entry",
        },
      },
      recurringExpenses: [
        {
          name: "Migrated Expense",
          amount: 500,
          dayOfMonth: 10,
          category: "Bills",
        },
      ],
      todoItems: [
        {
          text: "Migrated todo",
          completed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });
});
