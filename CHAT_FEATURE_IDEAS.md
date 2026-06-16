# AI Chat Assistant — Feature Brainstorm

A catalog of features the FinWise chat assistant could grow into, organized by category. Items marked ✅ are already implemented; everything else is a candidate for future work.

---

## 1. Conversational Insights (Q&A)
- ✅ Net worth, income/expense, budget status Q&A (existing system prompt context)
- ✅ Spending trend analysis ("Am I spending more than last month?") — 6-month income/expense history added to system prompt
- ✅ Comparison across time periods ("Compare my spending this month vs last 3 months average") — covered by the same 6-month history
- ✅ "What-if" simulations ("If I cut dining out by 30%, how much would I save per year?") — model does arithmetic from supplied data
- ✅ Category deep-dives ("Why did my Food spending spike in May?") — per-month category spending breakdown added to system prompt
- ✅ Anomaly explanations ("What's that NPR 5,000 charge on June 3rd?") — Recent Transactions now flag entries marked `[flagged as anomaly]`
- ✅ Forecast / projection ("At this rate, will I hit my savings goal by December?") — average monthly income/expenses/savings added to system prompt; model asks for goal amount/date if not given
- ✅ Subscription/recurring charge audit ("List all my recurring payments and their total") — recurring-tagged transactions and their total added to system prompt
- ✅ Cash flow runway ("How many months can I survive on my current balance if income stops?") — estimated runway (net worth / avg monthly expenses) added to system prompt

## 2. Agentic Actions (Confirmation-Card Flow)
- ✅ create_transaction, edit_transaction, delete_transaction
- ✅ create_account, update_account_balance
- ✅ set_budget
- ✅ set_accent_color, set_card_style, set_button_radius, set_theme_mode
- ✅ set_dashboard_charts
- ✅ Recurring transaction setup ("Add my rent of 15000 every month on the 1st") — create_transaction supports a `recurring` flag, tags the entry "recurring"
- Bulk transaction import via chat ("I spent 200 on coffee, 1500 on groceries, and 50 on bus today")
- ✅ Transfer money between accounts (create paired transactions) — new `transfer_funds` tool + confirmation card; creates a paired expense/income transaction tagged "transfer" (account balances follow via the existing DB trigger)
- Archive/restore accounts via chat
- Goal creation/management ("Create a savings goal of 100000 by December")
- Tag management (create/rename/merge tags via chat)
- Category rename/merge ("Merge 'Dining' into 'Food'")
- Export data ("Export my June transactions as CSV")
- Undo last action ("Undo that")

## 3. Proactive / Push-Style Suggestions
- ✅ Dynamic suggestion chips based on real account/budget/transaction data
- ✅ Daily/weekly digest message ("Here's your week: you spent X, saved Y...") — new `/api/chat/insights` endpoint, shown as dismissible cards in chat
- ✅ Budget threshold alerts surfaced in chat ("You're at 90% of your Food budget") — same insights endpoint
- ✅ Bill due reminders ("Your Rent payment is due in 2 days") — derived from recurring-tagged transactions, due within 3 days
- ✅ Unusual spending alerts ("You spent 3x your average on Entertainment this week") — this month's category spend vs trailing 6-month average
- ✅ Savings streak encouragement ("You've stayed under budget for 3 weeks in a row!") — consecutive completed months with income > expenses
- ✅ Idle cash suggestions ("Your Savings account has grown 20% — consider a fixed deposit") — savings accounts holding 6+ months of expenses

## 4. Personalization & Memory
- ✅ Remember user preferences within chat (nickname) — stored in localStorage via a new Chat Preferences dialog, the model addresses the user by name when set
- ✅ Multi-turn context for follow-ups ("...and how does that compare to last month?") — full conversation history is already sent with each request
- ✅ Learn spending personas ("You're a 'weekend spender' — most expenses happen Fri-Sun") — computed from 6-month weekday/weekend and category trends, surfaced to the model as "Detected persona traits"
- ✅ Custom categorization rules ("Always categorize Uber as Transport") — keyword → category rules stored in localStorage via Chat Preferences dialog, applied when the model creates transactions
- ✅ Pin/save favorite questions or reports — pin/unpin button on user messages, pinned questions shown as quick-access chips in the empty chat state

## 5. Visualization-in-Chat
- ✅ Inline mini-charts in chat responses (category pie, 6-month income/expense trend) — `show_chart` tool + ChatChart component
- ✅ "Show me a chart of X" → renders a Recharts component inline
- ✅ Render a small table for multi-row answers (e.g., budget breakdown) — new `show_table` tool + ChatTable component, covers budget breakdown, category breakdown, and recent transactions
- ✅ Shareable/exportable summary cards — "Copy" button on assistant responses copies the text (and any table as Markdown) to the clipboard for sharing

## 6. Financial Coaching / Education
- ✅ Personalized tips based on spending patterns (e.g., "You spend 40% more on weekends") — average weekday vs weekend daily spending added to system prompt
- ✅ Explain financial terms ("What does APR mean?") — model answers from general knowledge per prompt guidance
- ✅ Debt payoff strategies (if loan/credit accounts are tracked) — model gives general strategies (avalanche/snowball) and notes no debt accounts are tracked
- ✅ Savings rate calculation and benchmarking ("Your savings rate is 18%, which is decent") — savings rate % added to system prompt with rough benchmarks
- ✅ Goal-based planning conversations ("I want to save for a trip — help me plan") — model uses avg monthly savings + category breakdown, asks for goal details if missing

## 7. Multi-Modal Input
- ✅ Voice input for chat (speech-to-text) — mic button in the composer uses the browser's Web Speech API, shown only when supported
- Receipt/photo upload → OCR → auto-create transaction (extends NL parsing)
- Bank statement PDF/CSV upload → bulk parse and import via chat review flow
- Forward SMS/email transaction alerts → auto-parsed entries

## 8. Notifications & Channels
- Telegram/WhatsApp bot bridge using the same chat backend
- Email digest summarizing chat-derived insights
- Browser push notifications for proactive alerts

## 9. Collaboration (if multi-user is added later)
- Shared household budget chat ("How much did we spend on groceries as a family?")
- Split expense suggestions ("Split this 3000 dinner between me and Sarah")
- Role-based permissions for agentic actions (e.g., only admin can delete transactions)

## 10. Safety, Trust & Control
- ✅ Claude-style confirmation cards before any mutation
- ✅ Rate limiting / cost-aware usage indicator for LLM calls — header shows remaining daily tokens per model, plus multi-key fallback on 429
- Action history / audit log ("Show me what changes you made for me this week")
- Granular permission toggles ("Don't let AI change my theme settings")
- Explainability ("Why do you think this transaction is an anomaly?")

## 11. Performance & UX Polish
- ✅ Streaming responses (token-by-token) instead of waiting for full reply
- ✅ Conversation history persistence across sessions (currently resets on reload)
- ✅ Multiple conversation threads ("New chat" / chat history sidebar)
- Typing indicators per tool call ("Looking up your accounts...")
- Quick-reply buttons for common follow-ups

---

## Suggested Near-Term Priorities
1. ✅ **Conversation persistence** — store chat history in Supabase so it survives reloads.
2. ✅ **Streaming replies** — noticeably improves perceived speed for Groq responses.
3. ✅ **Recurring transaction tool** — high-value agentic action, builds on existing schema.
4. ✅ **Inline mini-charts** — leverages existing Recharts setup for richer answers.
5. **Daily/weekly digest** — reuses the suggestions-route data-fetching pattern. (not yet implemented)

## Also completed (beyond the original near-term list)
- Spending trend / comparison / what-if Q&A via expanded financial snapshot context
- Multiple conversation threads with a history sidebar
- Model picker (Llama 3.3 70B / 3.1 8B / Gemma2 9B) + daily token-usage indicator + multi-key fallback
