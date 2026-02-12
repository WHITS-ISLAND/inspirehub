import type { InferResponseType } from "hono/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, handleResponse } from "@/lib/api";

type ReactionToggleResponse = InferResponseType<
  (typeof api.nodes)[":id"]["like"]["$post"],
  200
>;

interface ReactionStatus {
  count: number;
  is_reacted?: boolean;
}

interface Reactions {
  like: ReactionStatus;
  interested: ReactionStatus;
  want_to_try: ReactionStatus;
}

type ReactionType = keyof Reactions;

function getReactionFetcher(nodeId: string, type: ReactionType) {
  const param = { id: nodeId };
  if (type === "like") return () => api.nodes[":id"].like.$post({ param });
  if (type === "interested") return () => api.nodes[":id"].interested.$post({ param });
  return () => api.nodes[":id"]["want-to-try"].$post({ param });
}

function updateReactionsInData(data: unknown, nodeId: string, type: ReactionType): boolean {
  if (!data || typeof data !== "object") return false;

  // NodeDetail shape: { id, reactions, ... }
  const detail = data as Record<string, unknown>;
  if (detail.id === nodeId && detail.reactions) {
    const reactions = detail.reactions as Reactions;
    const current = reactions[type];
    const wasReacted = current.is_reacted ?? false;
    reactions[type] = {
      count: wasReacted ? current.count - 1 : current.count + 1,
      is_reacted: !wasReacted,
    };
    return true;
  }

  // NodesListResponse shape: { nodes: [...], total }
  if ("nodes" in detail && Array.isArray(detail.nodes)) {
    for (const node of detail.nodes as Record<string, unknown>[]) {
      if (node.id === nodeId && node.reactions) {
        const reactions = node.reactions as Reactions;
        const current = reactions[type];
        const wasReacted = current.is_reacted ?? false;
        reactions[type] = {
          count: wasReacted ? current.count - 1 : current.count + 1,
          is_reacted: !wasReacted,
        };
        return true;
      }
    }
  }

  return false;
}

export function useToggleReaction(nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: ReactionType) => {
      const fetcher = getReactionFetcher(nodeId, type);
      const res = await fetcher();
      return handleResponse<ReactionToggleResponse>(res, fetcher);
    },
    onMutate: async (type: ReactionType) => {
      await queryClient.cancelQueries({ queryKey: ["nodes"] });

      const snapshots: [readonly unknown[], unknown][] = [];
      const allQueries = queryClient.getQueriesData<unknown>({ queryKey: ["nodes"] });

      for (const [key, data] of allQueries) {
        if (data == null) continue;
        snapshots.push([key, structuredClone(data)]);
        queryClient.setQueryData(key, (old: unknown) => {
          if (old == null) return old;
          const clone = structuredClone(old);
          updateReactionsInData(clone, nodeId, type);
          return clone;
        });
      }

      return { snapshots };
    },
    onError: (_err, _type, context) => {
      if (!context?.snapshots) return;
      for (const [key, data] of context.snapshots) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId] });
    },
  });
}

export type { Reactions, ReactionType, ReactionStatus };
