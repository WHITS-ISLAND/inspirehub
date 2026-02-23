import { CircleAlert, Lightbulb, type LucideIcon } from "lucide-react";

export const NODE_TYPE_STYLES = {
  issue: {
    label: "課題",
    icon: CircleAlert as LucideIcon,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    iconClassName: "text-red-800 dark:text-red-300",
  },
  idea: {
    label: "アイデア",
    icon: Lightbulb as LucideIcon,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    iconClassName: "text-blue-800 dark:text-blue-300",
  },
  project: {
    label: "プロジェクト",
    icon: null,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    iconClassName: "text-green-800 dark:text-green-300",
  },
} as const;

export type NodeType = keyof typeof NODE_TYPE_STYLES;

export function getToggleButtonColor(type: "issue" | "idea", isActive: boolean): string {
  if (type === "issue") {
    return isActive
      ? "border-red-400 bg-red-100 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300"
      : "border-border text-muted-foreground hover:border-red-300";
  }
  return isActive
    ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
    : "border-border text-muted-foreground hover:border-blue-300";
}
