import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:opacity-90",
        secondary:
          "bg-card text-card-foreground border border-border hover:bg-muted",
        accent:
          "bg-primary text-primary-foreground hover:opacity-90",
        ghost:
          "hover:bg-muted text-foreground",
        outline:
          "border border-border bg-transparent hover:bg-muted text-foreground",
        danger:
          "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-full",
        md: "h-10 px-5 text-sm rounded-full",
        lg: "h-12 px-6 text-base rounded-full",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
