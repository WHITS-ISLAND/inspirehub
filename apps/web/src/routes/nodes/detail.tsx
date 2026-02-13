import { useState, useRef, useEffect } from "react";
import { createRoute, Link, useNavigate, type AnyRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import {
  ArrowLeft,
  CircleAlert,
  EllipsisVertical,
  GitFork,
  Lightbulb,
  Loader2,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { api, handleResponse } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { usePostComment, useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { ReactionButtons } from "@/components/nodes/ReactionButtons";
import { TagInput } from "@/components/nodes/TagInput";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NodeDetail = InferResponseType<(typeof api.nodes)[":id"]["$get"], 200>;
type NodesListResponse = InferResponseType<(typeof api.nodes)["$get"], 200>;
type CommentsListResponse = InferResponseType<
  (typeof api.nodes)[":nodeId"]["comments"]["$get"],
  200
>;
type NodeCreateResponse = InferResponseType<(typeof api.nodes)["$post"], 201>;
type MessageResponse = InferResponseType<(typeof api.nodes)[":id"]["$put"], 200>;
type Comment = CommentsListResponse["comments"][number];

function DeriveIdeaDialog({
  parentNodeId,
  parentTitle,
  parentContent,
}: {
  parentNodeId: string;
  parentTitle: string;
  parentContent: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const createDerived = useMutation({
    mutationFn: async (body: { title: string; content: string; tags?: string[] }) => {
      const fetcher = () =>
        api.nodes.$post({
          json: {
            type: "idea",
            title: body.title,
            content: body.content,
            parent_node_id: parentNodeId,
            tags: body.tags?.length ? body.tags : undefined,
          },
        });
      const res = await fetcher();
      return handleResponse<NodeCreateResponse>(res, fetcher);
    },
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setContent("");
      setTags([]);
      void queryClient.invalidateQueries({ queryKey: ["nodes", { parent_node_id: parentNodeId }] });
    },
  });

  const isMobile = useIsMobile();

  const handleSubmit = () =>
    createDerived.mutate({ title: title.trim(), content: content.trim(), tags });

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">派生元</label>
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <p className="text-sm font-medium">{parentTitle}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{parentContent}</p>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">タイトル</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル…"
          aria-label="タイトル"
          className="rounded-md bg-background"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">本文</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="内容…"
          aria-label="内容"
          rows={4}
          className="rounded-md bg-background"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">タグ</label>
        <TagInput tags={tags} onTagsChange={setTags} />
      </div>
    </div>
  );

  const trigger = (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <GitFork size={14} className="mr-1" />
      派生アイデアを投稿
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-full bg-gray-50 dark:bg-zinc-900">
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border bg-background px-4 py-1.5 text-base text-muted-foreground"
              >
                キャンセル
              </button>
              <span className="text-base font-semibold">派生アイデアを投稿</span>
              <button
                onClick={handleSubmit}
                disabled={createDerived.isPending || !title.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-base font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createDerived.isPending ? "投稿中…" : "投稿"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">{formFields}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>派生アイデアを投稿</DialogTitle>
          </DialogHeader>
          <div className="mt-2">{formFields}</div>
          <Button
            className="mt-2 w-full"
            onClick={handleSubmit}
            disabled={createDerived.isPending || !title.trim()}
          >
            {createDerived.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            投稿
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

const typeStyles = {
  issue: {
    label: "課題",
    icon: CircleAlert,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    textClassName: "text-red-800 dark:text-red-300",
  },
  idea: {
    label: "アイデア",
    icon: Lightbulb,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    textClassName: "text-blue-800 dark:text-blue-300",
  },
  project: {
    label: "プロジェクト",
    icon: null,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    textClassName: "text-green-800 dark:text-green-300",
  },
};

function CommentItem({ comment, nodeId }: { comment: Comment; nodeId: string }) {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const isOwner = user?.id === comment.author_id;

  const updateComment = useUpdateComment(nodeId);
  const deleteComment = useDeleteComment(nodeId);

  return (
    <div className="flex gap-3">
      {comment.author_picture && (
        <img
          src={comment.author_picture}
          alt={comment.author_name ?? ""}
          className="mt-0.5 h-7 w-7 rounded-full"
        />
      )}
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{comment.author_name ?? "匿名"}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {isOwner && !isEditing && (
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => {
                  setEditContent(comment.content);
                  setIsEditing(true);
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("このコメントを削除しますか？")) {
                    deleteComment.mutate(comment.id);
                  }
                }}
                disabled={deleteComment.isPending}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && editContent.trim()) {
                  updateComment.mutate(
                    { commentId: comment.id, content: editContent.trim() },
                    { onSuccess: () => setIsEditing(false) },
                  );
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button
              onClick={() =>
                updateComment.mutate(
                  { commentId: comment.id, content: editContent.trim() },
                  { onSuccess: () => setIsEditing(false) },
                )
              }
              disabled={updateComment.isPending || !editContent.trim()}
              className="rounded p-1 text-primary hover:bg-primary/10"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded p-1 text-muted-foreground hover:bg-secondary"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="mt-0.5 text-sm">{comment.content}</p>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply as Comment} nodeId={nodeId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NodeDetailContent({ id }: { id: string }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const nodeQuery = useQuery({
    queryKey: ["nodes", id],
    queryFn: async () => {
      const fetcher = () => api.nodes[":id"].$get({ param: { id } });
      const res = await fetcher();
      return handleResponse<NodeDetail>(res, fetcher);
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["nodes", id, "comments"],
    queryFn: async () => {
      const fetcher = () =>
        api.nodes[":nodeId"].comments.$get({ param: { nodeId: id }, query: {} });
      const res = await fetcher();
      return handleResponse<CommentsListResponse>(res, fetcher);
    },
  });

  const childNodesQuery = useQuery({
    queryKey: ["nodes", { parent_node_id: id }],
    queryFn: async () => {
      const fetcher = () => api.nodes.$get({ query: { parent_node_id: id } });
      const res = await fetcher();
      return handleResponse<NodesListResponse>(res, fetcher);
    },
  });

  const postComment = usePostComment(id);

  const updateNode = useMutation({
    mutationFn: async (body: { title?: string; content?: string; tags?: string[] }) => {
      const fetcher = () => api.nodes[":id"].$put({ param: { id }, json: body });
      const res = await fetcher();
      return handleResponse<MessageResponse>(res, fetcher);
    },
    onSuccess: () => {
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["nodes", id] });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async () => {
      const fetcher = () => api.nodes[":id"].$delete({ param: { id } });
      const res = await fetcher();
      return handleResponse<MessageResponse>(res, fetcher);
    },
    onSuccess: () => {
      void navigate({ to: "/" });
    },
  });

  if (nodeQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nodeQuery.error || !nodeQuery.data) {
    return <div className="p-4 text-center text-destructive">ノードの読み込みに失敗しました。</div>;
  }

  const node = nodeQuery.data;
  const typeStyle = typeStyles[node.type];
  const comments = commentsQuery.data?.comments ?? [];
  const isOwner = user?.id === node.author_id;

  const startEditing = () => {
    setEditTitle(node.title);
    setEditContent(node.content);
    setEditTags(node.tags.map((t) => t.name));
    setIsEditing(true);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="戻る"
        >
          <ArrowLeft size={18} />
        </Link>
        {isOwner && !isEditing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="メニュー"
            >
              <EllipsisVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    startEditing();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                >
                  <Pencil size={14} />
                  編集
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm("このノードを削除しますか？")) {
                      deleteNode.mutate();
                    }
                  }}
                  disabled={deleteNode.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-lg font-bold"
          />
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
          <TagInput tags={editTags} onTagsChange={setEditTags} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                updateNode.mutate({
                  title: editTitle,
                  content: editContent,
                  tags: editTags,
                })
              }
              disabled={updateNode.isPending || !editTitle.trim()}
            >
              {updateNode.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              保存
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyle.className}`}
            >
              {typeStyle.icon && <typeStyle.icon size={12} />}
              {typeStyle.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(node.created_at).toLocaleDateString()}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {node.author_picture && (
                <img
                  src={node.author_picture}
                  alt={node.author_name ?? ""}
                  className="h-5 w-5 rounded-full"
                />
              )}
              <span className="text-xs text-muted-foreground">{node.author_name ?? "匿名"}</span>
            </div>
          </div>

          <h1 className="mt-2 text-2xl font-bold">{node.title}</h1>

          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{node.content}</div>

          {node.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {node.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <ReactionButtons nodeId={node.id} reactions={node.reactions} variant="detail" />
            <DeriveIdeaDialog
              parentNodeId={node.id}
              parentTitle={node.title}
              parentContent={node.content}
            />
          </div>

        </>
      )}

      {(node.parent_node || (childNodesQuery.data && childNodesQuery.data.nodes.length > 0)) && (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <GitFork size={18} />
            派生ツリー
          </h2>
          <div className="relative mt-3 ml-3">
            <span className="absolute left-0 top-0 bottom-0 w-px bg-border" />

            {node.parent_node &&
              (() => {
                const parentStyle = typeStyles[node.parent_node.type];
                return (
                  <div className="relative pl-5 pb-2">
                    <span className="absolute left-0 top-4 h-px w-4 bg-border" />
                    <Link
                      to="/nodes/$id"
                      params={{ id: node.parent_node.id }}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/40"
                    >
                      {parentStyle.icon && (
                        <parentStyle.icon size={20} className={`shrink-0 ${parentStyle.textClassName}`} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            派生元
                          </span>
                          <span className={`text-xs ${parentStyle.textClassName}`}>
                            {parentStyle.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{node.parent_node.title}</p>
                      </div>
                    </Link>
                  </div>
                );
              })()}

            {childNodesQuery.data?.nodes.map((child) => {
              const style = typeStyles[child.type];
              return (
                <div key={child.id} className="relative pl-5 pb-2 last:pb-0">
                  <span className="absolute left-0 top-4 h-px w-4 bg-border" />
                  <Link
                    to="/nodes/$id"
                    params={{ id: child.id }}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/40"
                  >
                    {style.icon && (
                      <style.icon size={20} className={`shrink-0 ${style.textClassName}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          派生先
                        </span>
                        <span className={`text-xs ${style.textClassName}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{child.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{child.content}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-semibold">
          コメント {commentsQuery.data?.total ?? 0}
        </h2>

        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (commentText.trim()) {
              postComment.mutate(commentText.trim(), {
                onSuccess: () => setCommentText(""),
              });
            }
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="コメントを入力"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" size="sm" disabled={postComment.isPending || !commentText.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-4">
          {commentsQuery.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} nodeId={id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeDetailPage() {
  const { id } = nodeDetailRoute.useParams();
  return <NodeDetailContent id={id} />;
}

let nodeDetailRoute: ReturnType<typeof createRoute>;

export default (parentRoute: AnyRoute) => {
  nodeDetailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: "/nodes/$id",
    component: NodeDetailPage,
  });
  return nodeDetailRoute;
};
