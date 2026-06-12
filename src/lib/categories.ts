export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Utilities",
  "Education",
  "Rent",
  "Savings",
  "Other",
];

export const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Refund", "Other"];

export const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
