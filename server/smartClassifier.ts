// Smart Transaction Classifier
// Automatically determines if a transaction is income or expense based on description

export interface Classification {
  type: 'income' | 'expense' | 'exclude' | 'unknown';
  confidence: number;
  category: string;
}

export const smartClassifier = {
  // Comprehensive expense keywords
  expenseKeywords: {
    // Fuel & Transport
    fuel: ['shell', 'bp', 'esso', 'texaco', 'jet', 'gulf', 'total', 'petrol', 'diesel', 'fuel', 'gas station'],
    parking: ['parking', 'park', 'ncp', 'q-park', 'apcoa', 'parkopedia'],
    transport: ['tfl', 'transport for london', 'oyster', 'congestion', 'ulez', 'dart charge', 'toll'],
    carExpenses: ['mot', 'insurance', 'car wash', 'valeting', 'tyres', 'kwik fit', 'halfords', 'garage', 'repair', 'service'],
    
    // Groceries & Food
    groceries: ['tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'lidl', 'aldi', 'marks & spencer', 'm&s', 'co-op', 'iceland'],
    restaurants: ['restaurant', 'cafe', 'coffee', 'starbucks', 'costa', 'nero', 'pret', 'mcdonald', 'kfc', 'burger king', 'nando', 'pizza', 'takeaway', 'deliveroo', 'uber eats', 'just eat'],
    
    // Bills & Utilities
    bills: ['rent', 'council tax', 'water', 'electric', 'gas', 'broadband', 'phone', 'mobile', 'vodafone', 'ee', 'o2', 'three', 'virgin', 'bt', 'sky'],
    subscriptions: ['netflix', 'spotify', 'amazon prime', 'apple', 'google', 'microsoft', 'adobe', 'gym', 'membership'],
    
    // Shopping
    shopping: ['amazon', 'ebay', 'argos', 'currys', 'john lewis', 'next', 'zara', 'h&m', 'primark', 'sports direct'],
    
    // Personal
    personal: ['barber', 'haircut', 'salon', 'pharmacy', 'boots', 'superdrug', 'dentist', 'doctor', 'hospital'],
    
    // Generic expense indicators
    generic: ['payment', 'purchase', 'withdrawal', 'atm', 'cash', 'direct debit', 'standing order']
  },

  // Income keywords
  incomeKeywords: {
    rideshare: ['uber', 'bolt', 'freenow', 'free now', 'minicab', 'ridde', 'citywide'],
    horizonCars: ['horizon', 'buraqq', 'horizon cars'],
    salary: ['salary', 'wage', 'payroll', 'hmrc refund'],
    refunds: ['refund', 'reimbursement', 'cashback'],
    transfers: ['bank transfer', 'faster payment']
  },

  /**
   * Classify a transaction as income or expense based on description and amount
   * Primary signal: amount sign (+ = income, - = expense)
   * Secondary: description keywords for validation and categorization
   * Returns: { type: 'income' | 'expense' | 'exclude', confidence: 0-1, category: string }
   */
  classifyTransaction(description: string, amount: number): Classification {
    const desc = description.toLowerCase().trim();
    
    // FIRST: Check if it's an internal transfer (should be excluded)
    const excludeKeywords = ['olowogboye', 'olu olowogboye', 'o a olowogboye', 'oluwaseun', 
                            'wsx', 'pot', 'monzo pot', 'transfer to', 'transfer from', 'internal transfer', 'account transfer'];
    if (excludeKeywords.some(keyword => desc.includes(keyword))) {
      return { type: 'exclude', confidence: 1.0, category: 'internal_transfer' };
    }

    // SECOND: Use amount sign as primary signal
    // In bank statements: positive = money in (income), negative = money out (expense)
    if (amount !== undefined && amount !== null) {
      if (amount > 0) {
        // Positive amount = income
        // Check if we can categorize it more specifically
        for (const [category, keywords] of Object.entries(this.incomeKeywords)) {
          for (const keyword of keywords) {
            if (desc.includes(keyword)) {
              return { type: 'income', confidence: 0.95, category };
            }
          }
        }
        // Default to 'other' income if no specific category found
        return { type: 'income', confidence: 0.85, category: 'other' };
      } else if (amount < 0) {
        // Negative amount = expense
        // Check if we can categorize it more specifically
        for (const [category, keywords] of Object.entries(this.expenseKeywords)) {
          for (const keyword of keywords) {
            if (desc.includes(keyword)) {
              return { type: 'expense', confidence: 0.95, category };
            }
          }
        }
        // Check for generic expense indicators
        const expenseIndicators = ['ltd', 'limited', 'store', 'shop', 'market', 'service', 'bill', 'payment'];
        if (expenseIndicators.some(word => desc.includes(word))) {
          return { type: 'expense', confidence: 0.85, category: 'generic' };
        }
        // Default to 'other' expense
        return { type: 'expense', confidence: 0.85, category: 'other' };
      }
    }

    // FALLBACK: If no amount provided, use keywords only (lower confidence)
    // Check income keywords
    for (const [category, keywords] of Object.entries(this.incomeKeywords)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          return { type: 'income', confidence: 0.7, category };
        }
      }
    }

    // Check expense keywords
    for (const [category, keywords] of Object.entries(this.expenseKeywords)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          return { type: 'expense', confidence: 0.7, category };
        }
      }
    }

    // Last resort: default to expense
    return { type: 'expense', confidence: 0.3, category: 'unknown' };
  },

  /**
   * Fix amount based on classification
   * If classified as expense but amount is positive, make it negative
   * If classified as income but amount is negative, make it positive
   */
  fixAmount(amount: number, classification: Classification): number {
    if (classification.type === 'expense' && amount > 0) {
      return -amount;
    }
    if (classification.type === 'income' && amount < 0) {
      return Math.abs(amount);
    }
    return amount;
  },

  /**
   * Categorize income into specific work categories
   */
  categorizeIncome(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('uber')) return 'uber';
    if (desc.includes('bolt')) return 'bolt';
    if (desc.includes('freenow') || desc.includes('free now')) return 'freenow';
    if (desc.includes('horizon') || desc.includes('buraqq')) return 'horizoncars';
    if (desc.includes('minicab') || desc.includes('ridde') || desc.includes('citywide')) return 'other';
    
    return 'other';
  }
};
