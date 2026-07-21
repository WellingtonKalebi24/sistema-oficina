import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils.js";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive" | "link";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return <button className={cn("ui-button", `ui-button--${variant}`, className)} {...props} />;
}
