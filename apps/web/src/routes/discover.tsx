import { useState, useEffect } from "react";
import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { Search, Loader2, TrendingUp } from "lucide-react";
import { api, handleResponse } from "@/lib/api";
import { NodeCard } from "@/components/nodes/NodeCard";
import { Input } from "@/components/ui/input";

type TagsPopularResponse = InferResponseType<(typeof api.tags)["popular"]["$get"], 200>;
type TagsSuggestResponse = InferResponseType<(typeof api.tags)["suggest"]["$get"], 200>;
type NodesListResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const popularTags = useQuery({
    queryKey: ["tags", "popular"],
    queryFn: async () => {
      const res = await api.tags.popular.$get();
      return handleResponse<TagsPopularResponse>(res);
    },
  });

  const tagSuggestions = useQuery({
    queryKey: ["tags", "suggest", debouncedQuery],
    queryFn: async () => {
      const res = await api.tags.suggest.$get({ query: { q: debouncedQuery, limit: 5 } });
      return handleResponse<TagsSuggestResponse>(res);
    },
    enabled: debouncedQuery.length > 0 && !selectedTag,
  });

  const popularNodes = useQuery({
    queryKey: ["nodes", { sort: "popular" }],
    queryFn: async () => {
      const fetchPopular = () => api.nodes.$get({ query: { sort: "popular", limit: 5 } });
      const res = await fetchPopular();
      return handleResponse<NodesListResponse>(res, fetchPopular);
    },
  });

  const nodesQuery = useQuery({
    queryKey: ["nodes", { tag: selectedTag, q: selectedTag ? undefined : debouncedQuery }],
    queryFn: async () => {
      const query: Record<string, string> = { limit: "20" };
      if (selectedTag) query.tag = selectedTag;
      else if (debouncedQuery) query.q = debouncedQuery;
      const fetchNodes = () => api.nodes.$get({ query });
      const res = await fetchNodes();
      return handleResponse<NodesListResponse>(res, fetchNodes);
    },
    enabled: !!selectedTag || debouncedQuery.length > 0,
  });

  const matchedTags = tagSuggestions.data?.suggestions ?? [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">見つける</h1>

      <div className="relative mt-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedTag(null);
          }}
          placeholder="ノードやタグで検索..."
          className="pl-9"
        />
      </div>

      {!searchQuery && !selectedTag && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            人気のタグ
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {popularTags.isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {popularTags.data?.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.name)}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                {tag.name}
                <span className="ml-1.5 text-xs opacity-70">{tag.usage_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!searchQuery && !selectedTag && (
        <div className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <TrendingUp size={14} />
            人気の投稿
          </h2>
          <div className="mt-2 space-y-3">
            {popularNodes.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {popularNodes.data?.nodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {searchQuery && !selectedTag && matchedTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">タグ:</span>
          {matchedTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTag(tag.name);
                setSearchQuery("");
              }}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {selectedTag && (
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
            {selectedTag}
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            クリア
          </button>
        </div>
      )}

      {(selectedTag || debouncedQuery) && (
        <div className="mt-4 space-y-3">
          {!selectedTag && searchQuery && (
            <p className="text-sm text-muted-foreground">「{searchQuery}」の検索結果</p>
          )}

          {nodesQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {nodesQuery.data?.nodes.length === 0 && !nodesQuery.isLoading && (
            <div className="py-12 text-center text-muted-foreground">ノードが見つかりません。</div>
          )}

          {nodesQuery.data?.nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/discover",
    component: DiscoverPage,
  });
