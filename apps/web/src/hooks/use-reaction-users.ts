import type { InferResponseType } from "hono/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, handleResponse } from "@/lib/api";
import type { ReactionType } from "./use-toggle-reaction";

type ReactionUsersResponse = InferResponseType<
  (typeof api.nodes)[":id"]["reactions"]["like"]["$get"],
  200
>;

function getReactionUsersFetcher(
  nodeId: string,
  type: ReactionType,
  cursor?: string,
) {
  const param = { id: nodeId };
  const query = cursor ? { cursor } : {};

  if (type === "like")
    return () => api.nodes[":id"].reactions.like.$get({ param, query });
  if (type === "interested")
    return () => api.nodes[":id"].reactions.interested.$get({ param, query });
  return () =>
    api.nodes[":id"].reactions["want-to-try"].$get({ param, query });
}

function useReactionUsersQuery(
  nodeId: string,
  type: ReactionType,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: ["nodes", nodeId, "reaction-users", type],
    queryFn: async ({ pageParam }) => {
      const fetcher = getReactionUsersFetcher(nodeId, type, pageParam);
      const res = await fetcher();
      return handleResponse<ReactionUsersResponse>(res, fetcher);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
    enabled,
  });
}

export function useReactionUsers(nodeId: string, activeType: ReactionType, enabled: boolean) {
  const like = useReactionUsersQuery(nodeId, "like", enabled);
  const interested = useReactionUsersQuery(nodeId, "interested", enabled);
  const wantToTry = useReactionUsersQuery(nodeId, "want_to_try", enabled);

  const queries = { like, interested, want_to_try: wantToTry } as const;
  return queries[activeType];
}
