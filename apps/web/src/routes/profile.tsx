import { useState } from "react";
import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { api, handleResponse } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { NodeCard } from "@/components/nodes/NodeCard";
import { Input } from "@/components/ui/input";

type NodesListResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;
type UserUpdateResponse = InferResponseType<(typeof api.users)["me"]["$patch"], 200>;

const profileTabs = [
  { label: "自分", key: "posts" },
  { label: "いいね済み", key: "liked" },
] as const;

type TabKey = (typeof profileTabs)[number]["key"];

function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const myPosts = useQuery({
    queryKey: ["nodes", { author_id: user?.id }],
    queryFn: async () => {
      if (!user) return { nodes: [] as NodesListResponse["nodes"], total: 0 };
      const fetchMyPosts = () =>
        api.nodes.$get({
          query: { author_id: user.id, limit: 50 },
        });
      const res = await fetchMyPosts();
      return handleResponse<NodesListResponse>(res, fetchMyPosts);
    },
    enabled: activeTab === "posts" && !!user,
  });

  const likedPosts = useQuery({
    queryKey: ["nodes", { liked_by: "me" }],
    queryFn: async () => {
      const fetchLiked = () =>
        api.nodes.$get({
          query: { liked_by: "me" as const, limit: 50 },
        });
      const res = await fetchLiked();
      return handleResponse<NodesListResponse>(res, fetchLiked);
    },
    enabled: activeTab === "liked" && !!user,
  });

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const fetcher = () => api.users.me.$patch({ json: { name } });
      const res = await fetcher();
      return handleResponse<UserUpdateResponse>(res, fetcher);
    },
    onSuccess: (data) => {
      setIsEditingName(false);
      if (user) {
        setAuth({ ...user, name: data.user.name }, useAuthStore.getState().accessToken!);
      }
    },
  });

  if (!user) return null;

  const data = activeTab === "posts" ? myPosts : likedPosts;

  return (
    <div className="p-4">
      <div className="flex items-center gap-4">
        {user.picture && (
          <img
            src={user.picture}
            alt={user.name}
            fetchPriority="high"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-lg font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editName.trim()) {
                    updateName.mutate(editName.trim());
                  }
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              <button
                onClick={() => updateName.mutate(editName.trim())}
                disabled={updateName.isPending || !editName.trim()}
                aria-label="保存"
                className="rounded p-1 text-primary hover:bg-primary/10"
              >
                {updateName.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                aria-label="キャンセル"
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{user.name}</h1>
              <button
                onClick={() => {
                  setEditName(user.name);
                  setIsEditingName(true);
                }}
                aria-label="名前を編集"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-1 rounded-lg bg-secondary p-1">
        {profileTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <h2 className="sr-only">投稿一覧</h2>
      <div className="mt-4 space-y-3">
        {data?.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data?.data?.nodes.length === 0 && !data?.isLoading && (
          <div className="py-12 text-center text-muted-foreground">
            {activeTab === "posts" ? "まだ投稿がありません。" : "いいねした投稿はありません。"}
          </div>
        )}

        {data?.data?.nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/profile",
    component: ProfilePage,
  });
