import { useState } from "react";
import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { Loader2 } from "lucide-react";
import { api, handleResponse } from "@/lib/api";

type NodesListResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;
type NodeCreateResponse = InferResponseType<(typeof api.nodes)["$post"], 201>;
import { useAuthStore } from "@/stores/auth";
import { NodeCard } from "@/components/nodes/NodeCard";
import { TagInput } from "@/components/nodes/TagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NodeType = "issue" | "idea" | "project";

interface Tab {
  label: string;
  type?: NodeType;
  authorFilter?: boolean;
}

const tabs: Tab[] = [
  { label: "すべて" },
  { label: "課題", type: "issue" },
  { label: "アイデア", type: "idea" },
  { label: "自分", authorFilter: true },
];

function useNodes(params: {
  type?: NodeType;
  author_id?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["nodes", params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params.type) query.type = params.type;
      if (params.author_id) query.author_id = params.author_id;
      if (params.limit) query.limit = String(params.limit);
      if (params.offset) query.offset = String(params.offset);

      const fetchNodes = () => api.nodes.$get({ query });
      const res = await fetchNodes();
      return handleResponse<NodesListResponse>(res, fetchNodes);
    },
  });
}

type ComposeType = "issue" | "idea";

function InlineCompose() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [nodeType, setNodeType] = useState<ComposeType>("issue");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const createNode = useMutation({
    mutationFn: async () => {
      const fetcher = () =>
        api.nodes.$post({
          json: {
            type: nodeType,
            title,
            content,
            tags: tags.length > 0 ? tags : undefined,
          },
        });
      const res = await fetcher();
      return handleResponse<NodeCreateResponse>(res, fetcher);
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      setTags([]);
      setIsOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground hover:border-primary/30 hover:shadow-sm transition-all"
      >
        投稿する...
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex gap-2">
        {(["issue", "idea"] as const).map((t) => {
          const active = nodeType === t;
          const color =
            t === "issue"
              ? active
                ? "border-red-400 bg-red-100 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300"
                : "border-border text-muted-foreground hover:border-red-300"
              : active
                ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-border text-muted-foreground hover:border-blue-300";
          return (
            <button
              key={t}
              onClick={() => setNodeType(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${color}`}
            >
              {t === "issue" ? "課題" : "アイデア"}
            </button>
          );
        })}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        autoFocus
        className="bg-background"
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="内容"
        rows={3}
        className="bg-background"
      />
      <TagInput tags={tags} onTagsChange={setTags} />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setTitle("");
            setContent("");
            setTags([]);
          }}
        >
          キャンセル
        </Button>
        <Button
          size="sm"
          onClick={() => createNode.mutate()}
          disabled={createNode.isPending || !title.trim()}
        >
          {createNode.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          投稿
        </Button>
      </div>
      {createNode.error && <p className="text-xs text-destructive">投稿に失敗しました。</p>}
    </div>
  );
}

function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuthStore();
  const tab = tabs[activeTab];

  const { data, isLoading, error } = useNodes({
    type: tab.type,
    author_id: tab.authorFilter ? user?.id : undefined,
    limit: 20,
  });

  return (
    <div className="p-4">
      <div className="mb-4 hidden md:block">
        <InlineCompose />
      </div>

      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === i
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            ノードの読み込みに失敗しました。再試行してください。
          </div>
        )}

        {data?.nodes.length === 0 && !isLoading && (
          <div className="py-12 text-center text-muted-foreground">ノードが見つかりません。</div>
        )}

        {data?.nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/",
    component: HomePage,
  });
