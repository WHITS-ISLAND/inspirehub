import { useState, useRef, useEffect, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useReactionUsers } from "@/hooks/use-reaction-users";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { Reactions, ReactionType } from "@/hooks/use-toggle-reaction";

import { reactionMeta } from "./ReactionButtons";

interface ReactionUsersDrawerProps {
  nodeId: string;
  reactions: Reactions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType: ReactionType;
}

export function ReactionUsersDrawer({
  nodeId,
  reactions,
  open,
  onOpenChange,
  initialType,
}: ReactionUsersDrawerProps) {
  const isMobile = useIsMobile();
  const [activeType, setActiveType] = useState<ReactionType>(initialType);

  useEffect(() => {
    if (open) setActiveType(initialType);
  }, [open, initialType]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useReactionUsers(
    nodeId,
    activeType,
    open,
  );

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const users = data?.pages.flatMap((page) => page.data) ?? [];

  const tabBar = (
    <div className="flex border-b border-border px-2">
      {reactionMeta.map(({ key, icon: Icon, label, color }) => {
        const isActive = activeType === key;
        return (
          <button
            key={key}
            onClick={() => setActiveType(key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm ${
              isActive ? color : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={15} className={isActive ? "fill-current" : ""} />
            <span>{label}</span>
            <span className="text-xs tabular-nums">{reactions[key].count}</span>
            {isActive && (
              <span
                className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${color.replace("text-", "bg-")}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  const userList = (
    <div className="[&_*]:!transition-none">
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          読み込み中...
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          まだリアクションはありません
        </div>
      ) : (
        <div className="px-6 py-2">
          {users.map((user, i) => (
            <div key={user.user_id}>
              <div className="flex items-center gap-4 py-3.5">
                {user.user_picture ? (
                  <img
                    src={user.user_picture}
                    alt={user.user_name ?? ""}
                    loading="lazy"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-medium text-muted-foreground">
                    {(user.user_name ?? "?")[0]}
                  </div>
                )}
                <span className="text-sm font-medium">{user.user_name ?? "匿名ユーザー"}</span>
              </div>
              {i < users.length - 1 && <div className="border-b border-border/50" />}
            </div>
          ))}
          {hasNextPage && <div ref={sentinelRef} className="h-4" />}
          {isFetchingNextPage && (
            <div className="py-3 text-center text-xs text-muted-foreground">読み込み中...</div>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[75vh]">
          <DrawerHeader>
            <DrawerTitle>リアクション</DrawerTitle>
            <DrawerDescription className="sr-only">
              リアクションしたユーザーの一覧
            </DrawerDescription>
          </DrawerHeader>
          {tabBar}
          <div className="flex-1 overflow-y-auto">{userList}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>リアクション</DialogTitle>
          <DialogDescription className="sr-only">リアクションしたユーザーの一覧</DialogDescription>
        </DialogHeader>
        {tabBar}
        <div className="min-h-[60vh] max-h-[70vh] overflow-y-auto">{userList}</div>
      </DialogContent>
    </Dialog>
  );
}
