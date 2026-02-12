import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// cn(): merge Tailwind classes. Dani uses it everywhere. So do we. No shame.

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
