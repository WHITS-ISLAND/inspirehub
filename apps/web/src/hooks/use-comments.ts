import type { InferResponseType } from "hono/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, handleResponse } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

type CommentsListResponse = InferResponseType<
  (typeof api.nodes)[":nodeId"]["comments"]["$get"],
  200
>;
type CommentCreateResponse = InferResponseType<
  (typeof api.nodes)[":nodeId"]["comments"]["$post"],
  201
>;
type Comment = CommentsListResponse["comments"][number];

export function removeCommentById(comments: Comment[], id: string): Comment[] {
  return comments.reduce<Comment[]>((acc, c) => {
    if (c.id === id) return acc;
    const filtered = { ...c };
    if (c.replies && c.replies.length > 0) {
      filtered.replies = removeCommentById(c.replies as Comment[], id) as typeof c.replies;
    }
    acc.push(filtered);
    return acc;
  }, []);
}

export function updateCommentContent(comments: Comment[], id: string, content: string): Comment[] {
  return comments.map((c) => {
    if (c.id === id) return { ...c, content };
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: updateCommentContent(c.replies as Comment[], id, content) as typeof c.replies,
      };
    }
    return c;
  });
}

export function usePostComment(nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const fetcher = () =>
        api.nodes[":nodeId"].comments.$post({ param: { nodeId }, json: { content } });
      const res = await fetcher();
      return handleResponse<CommentCreateResponse>(res, fetcher);
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["nodes", nodeId, "comments"] });

      const snapshot = queryClient.getQueryData<CommentsListResponse>([
        "nodes",
        nodeId,
        "comments",
      ]);

      const user = useAuthStore.getState().user;
      const tempComment = {
        id: crypto.randomUUID(),
        content,
        author_id: user?.id ?? "",
        author_name: user?.name ?? null,
        author_picture: user?.picture ?? null,
        created_at: new Date().toISOString(),
        replies: [],
      } as unknown as Comment;

      queryClient.setQueryData<CommentsListResponse>(
        ["nodes", nodeId, "comments"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            comments: [...old.comments, tempComment],
            total: old.total + 1,
          };
        },
      );

      return { snapshot };
    },
    onError: (_err, _content, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(["nodes", nodeId, "comments"], context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId, "comments"] });
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId] });
    },
  });
}

export function useUpdateComment(nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const fetcher = () =>
        api.comments[":id"].$put({ param: { id: commentId }, json: { content } });
      const res = await fetcher();
      return handleResponse<InferResponseType<(typeof api.comments)[":id"]["$put"], 200>>(
        res,
        fetcher,
      );
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["nodes", nodeId, "comments"] });

      const snapshot = queryClient.getQueryData<CommentsListResponse>([
        "nodes",
        nodeId,
        "comments",
      ]);

      queryClient.setQueryData<CommentsListResponse>(
        ["nodes", nodeId, "comments"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            comments: updateCommentContent(old.comments, commentId, content),
          };
        },
      );

      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(["nodes", nodeId, "comments"], context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId, "comments"] });
    },
  });
}

export function useDeleteComment(nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const fetcher = () => api.comments[":id"].$delete({ param: { id: commentId } });
      const res = await fetcher();
      return handleResponse<InferResponseType<(typeof api.comments)[":id"]["$delete"], 200>>(
        res,
        fetcher,
      );
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["nodes", nodeId, "comments"] });

      const snapshot = queryClient.getQueryData<CommentsListResponse>([
        "nodes",
        nodeId,
        "comments",
      ]);

      queryClient.setQueryData<CommentsListResponse>(
        ["nodes", nodeId, "comments"],
        (old) => {
          if (!old) return old;
          const filtered = removeCommentById(old.comments, commentId);
          return {
            ...old,
            comments: filtered,
            total: old.total - (old.comments.length - filtered.length),
          };
        },
      );

      return { snapshot };
    },
    onError: (_err, _commentId, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(["nodes", nodeId, "comments"], context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId, "comments"] });
      void queryClient.invalidateQueries({ queryKey: ["nodes", nodeId] });
    },
  });
}
