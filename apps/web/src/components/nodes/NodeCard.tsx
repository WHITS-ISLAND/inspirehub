import { Link } from "@tanstack/react-router";
import { MessageCircle, GitFork } from "lucide-react";
import type { InferResponseType } from "hono/client";
import { api } from "@/lib/api";
import { NODE_TYPE_STYLES } from "@/lib/node-types";
import { ReactionButtons } from "./ReactionButtons";
import { timeAgo } from "@/lib/time";

type NodesResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;
type Node = NodesResponse["nodes"][number];

interface NodeCardProps {
  node: Node;
}

export function NodeCard({ node }: NodeCardProps) {
  const typeStyle = NODE_TYPE_STYLES[node.type];

  return (
    <Link
      to="/nodes/$id"
      params={{ id: node.id }}
      className="block rounded-xl border border-border bg-secondary/20 p-4 hover:bg-secondary/40 hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in-up"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.className}`}
          >
            {typeStyle.icon && <typeStyle.icon size={12} />}
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
            loading="lazy"
            width={20}
            height={20}
            className="h-5 w-5 rounded-full"
          />
        )}
        <span className="text-xs text-muted-foreground">{node.author_name ?? "匿名"}</span>
      </div>
    </Link>
  );
}
