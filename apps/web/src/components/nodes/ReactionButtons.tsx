import { Heart, Flame, Rocket } from "lucide-react";
import type { InferResponseType } from "hono/client";
import { api, handleResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ReactionToggleResponse = InferResponseType<(typeof api.nodes)[":id"]["like"]["$post"], 200>;

interface ReactionStatus {
  count: number;
  is_reacted?: boolean;
}

interface Reactions {
  like: ReactionStatus;
  interested: ReactionStatus;
  want_to_try: ReactionStatus;
}

interface ReactionButtonsProps {
  nodeId: string;
  reactions: Reactions;
  variant?: "compact" | "detail";
}

const reactionMeta = [
  { key: "like", icon: Heart, label: "いいね" },
  { key: "interested", icon: Flame, label: "気になる" },
  { key: "want_to_try", icon: Rocket, label: "やってみたい" },
] as const;

function getReactionFetcher(nodeId: string, type: keyof Reactions) {
  const param = { id: nodeId };
  if (type === "like") return () => api.nodes[":id"].like.$post({ param });
  if (type === "interested") return () => api.nodes[":id"].interested.$post({ param });
  return () => api.nodes[":id"]["want-to-try"].$post({ param });
}

async function toggleReaction(nodeId: string, type: keyof Reactions) {
  const fetcher = getReactionFetcher(nodeId, type);
  const res = await fetcher();
  return handleResponse<ReactionToggleResponse>(res, fetcher);
}

export function ReactionButtons({ nodeId, reactions, variant = "compact" }: ReactionButtonsProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (type: keyof Reactions) => toggleReaction(nodeId, type),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5">
        {reactionMeta.map(({ key, icon: Icon }) => {
          const reaction = reactions[key];
          const isActive = reaction.is_reacted;
          return (
            <button
              key={key}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                mutation.mutate(key);
              }}
              disabled={mutation.isPending}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs active:scale-90 transition-transform ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon size={14} className={isActive ? "fill-current" : ""} />
              {reaction.count > 0 && <span>{reaction.count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {reactionMeta.map(({ key, icon: Icon, label }) => {
        const reaction = reactions[key];
        const isActive = reaction.is_reacted;
        return (
          <button
            key={key}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mutation.mutate(key);
            }}
            disabled={mutation.isPending}
            className={`flex flex-col items-center active:scale-90 transition-transform ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} className={isActive ? "fill-current" : ""} />
            <div className="mt-0.5 flex items-center gap-0.5">
              <span className="text-[10px]">{label}</span>
              {reaction.count > 0 && (
                <span className="text-[10px] font-medium">{reaction.count}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
