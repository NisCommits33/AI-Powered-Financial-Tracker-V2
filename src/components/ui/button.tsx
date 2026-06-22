import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20",
        destructive: "bg-destructive text-primary-foreground hover:opacity-90",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        ghost: "hover:bg-foreground/5 text-foreground",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, title, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const accessibleLabel = props["aria-label"];
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        // Applied as an inline style (not a `rounded-*` class) so tailwind-merge
        // can't drop it when a caller's className also sets a rounded-* utility
        // (e.g. rounded-full on icon buttons) - the Settings "Button Border"
        // control would otherwise silently have no effect on those buttons.
        style={variant === "link" ? style : { borderRadius: "var(--btn-radius)", ...style }}
        title={title ?? (typeof accessibleLabel === "string" ? accessibleLabel : undefined)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
