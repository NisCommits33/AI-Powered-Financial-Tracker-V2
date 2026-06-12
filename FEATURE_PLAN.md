# Feature Plan — Profile Page, Button Border Fix, "See All" in Charts

## 1. Profile Page

**New route:** `src/app/(app)/profile/page.tsx`

A simple single-user profile page:
- Avatar (initial) + editable display name, persisted via a new small `userStore` (Zustand + `persist`, like `themeStore`).
- Read-only summary stats derived from existing hooks (no new queries): net worth, number of accounts, total transactions, member-since (earliest account `created_at`).
- Quick links to Settings and Accounts.

**Entry point:** the "U" avatar circle in `TopBar.tsx` (currently a static div) becomes a `Link` to `/profile`.

## 2. Button Border setting not applying

**Root cause:** `buttonVariants` applies the radius via the Tailwind utility class
`rounded-[var(--btn-radius)]`. Any `<Button>` instance that also passes a `className`
containing another `rounded-*` class (e.g. `rounded-full` for icon buttons, `rounded-xl`
overrides) gets merged through `tailwind-merge`, which treats all `rounded-*` utilities
as one group and **keeps only the last one** — silently dropping
`rounded-[var(--btn-radius)]`. Since many `<Button>` usages across the app pass their own
`rounded-*`/size classes, the Settings → Button Border control visibly does nothing for
those buttons (and looks like it's "not working" overall).

**Fix:** apply `--btn-radius` as an inline `style.borderRadius` on the `Button`
component instead of (only) a utility class. Inline styles aren't touched by
`tailwind-merge`, so the setting always applies, while an explicit `style` prop passed
by a caller still takes precedence if ever needed.

`src/components/ui/button.tsx`:
```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ borderRadius: "var(--btn-radius)", ...style }}
        ref={ref}
        {...props}
      />
    );
  }
);
```
(Drop the now-redundant `rounded-[var(--btn-radius)]` from `buttonVariants`, keeping a
static `rounded-xl` fallback for non-JS/no-class-applied edge cases.)

## 3. "See All" in charts

**Target:** the "Spending by Category" donut on the dashboard (`enabledCharts.includes("category")`),
which currently shows only the top 5 categories (`categoryData.slice(0, 5)`).

**Change:**
- Compute the full (unsliced) category breakdown alongside the top-5 `categoryData`.
- Add a "See all" link/button in the section header, next to the title.
- Clicking it opens a `Dialog` (shadcn, already used elsewhere) listing every category
  with its amount and share %, reusing the same color legend styling as the inline list.

No new data fetching — both the top-5 and full list are derived from transactions
already in the `transactionStore`.

## Implementation order
1. Button border fix (small, high-value, fixes an existing broken setting).
2. "See all" category dialog on the dashboard.
3. Profile page + TopBar avatar link.
