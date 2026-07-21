import type { LabelHTMLAttributes } from "react";

import { cn } from "../../lib/utils.js";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("ui-label", className)} {...props} />;
}
