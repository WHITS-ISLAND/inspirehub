import type { InferResponseType } from "hono/client";
import { useQuery } from "@tanstack/react-query";
import { api, handleResponse } from "@/lib/api";

type TagsSuggestResponse = InferResponseType<(typeof api.tags)["suggest"]["$get"], 200>;

export function useTagSuggestions(query: string) {
  const { data, isError } = useQuery({
    queryKey: ["tags", "suggest", query],
    queryFn: async () => {
      const res = await api.tags.suggest.$get({ query: { q: query, limit: 5 } });
      return handleResponse<TagsSuggestResponse>(res);
    },
    enabled: query.length > 0,
  });

  return { data, isError };
}
