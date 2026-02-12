import { Link } from "@tanstack/react-router";
import { MessageCircle, GitFork } from "lucide-react";
import { ReactionButtons } from "./ReactionButtons";

interface NodeCardProps {
  node: {
    id: string;
    type: "issue" | "idea" | "project";
    title: string;
    content: string;
    author_name: string | null;
    author_picture: string | null;
    created_at: string;
    tags: { id: string; name: string }[];
    reactions: {
      like: { count: number; is_reacted?: boolean };
      interested: { count: number; is_reacted?: boolean };
      want_to_try: { count: number; is_reacted?: boolean };
    };
    comment_count: number;
    parent_node?: { id: string; type: string; title: string } | null;
  };
}

const typeStyles = {
  issue: {
    label: "課題",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  idea: {
    label: "アイデア",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  project: {
    label: "プロジェクト",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

const hoverBorder = {
  issue: "hover:border-red-300 dark:hover:border-red-700",
  idea: "hover:border-blue-300 dark:hover:border-blue-700",
  project: "hover:border-green-300 dark:hover:border-green-700",
};

export function NodeCard({ node }: NodeCardProps) {
  const typeStyle = typeStyles[node.type];

  return (
    <Link
      to="/nodes/$id"
      params={{ id: node.id }}
      className={`block rounded-xl border border-border bg-secondary/20 p-4 ${hoverBorder[node.type]} hover:bg-secondary/40 hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in-up`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.className}`}>
            {typeStyle.label}
          </span>
          {node.parent_node && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitFork size={12} />
              派生
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo(node.created_at)}</span>
      </div>

      <h3 className="mt-2 font-semibold leading-snug">{node.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{node.content}</p>

      {node.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <ReactionButtons nodeId={node.id} reactions={node.reactions} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {node.comment_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle size={14} />
              {node.comment_count}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {node.author_picture && (
          <img
            src={node.author_picture}
            alt={node.author_name ?? ""}
            className="h-5 w-5 rounded-full"
          />
        )}
        <span className="text-xs text-muted-foreground">{node.author_name ?? "匿名"}</span>
      </div>
    </Link>
  );
}
