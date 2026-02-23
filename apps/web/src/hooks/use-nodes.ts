import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api, handleResponse } from "@/lib/api";

type NodesListResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;

const PAGE_SIZE = 20;

export function useInfiniteNodes(
  params: { type?: string; author_id?: string; reacted_by?: "me" },
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ["nodes", params],
    queryFn: async ({ pageParam = 0 }) => {
      const query: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(pageParam) };
      if (params.type) query.type = params.type;
      if (params.author_id) query.author_id = params.author_id;
      if (params.reacted_by) query.reacted_by = params.reacted_by;
      const fetcher = () => api.nodes.$get({ query });
      const res = await fetcher();
      return handleResponse<NodesListResponse>(res, fetcher);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.nodes.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: options?.enabled,
  });
}
