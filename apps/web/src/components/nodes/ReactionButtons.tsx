import { useState, useCallback } from "react";
import { Heart, Flame, Rocket } from "lucide-react";
import { useToggleReaction, type Reactions, type ReactionType } from "@/hooks/use-toggle-reaction";
import { useLongPress } from "@/hooks/use-long-press";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ReactionUsersDrawer } from "./ReactionUsersDrawer";

interface ReactionButtonsProps {
  nodeId: string;
  reactions: Reactions;
  variant?: "compact" | "detail";
}

export const reactionMeta = [
  { key: "like", icon: Heart, label: "いいね", color: "text-rose-500", bg: "bg-rose-500/15" },
  { key: "interested", icon: Flame, label: "気になる", color: "text-amber-500", bg: "bg-amber-500/15" },
  { key: "want_to_try", icon: Rocket, label: "やってみたい", color: "text-violet-500", bg: "bg-violet-500/15" },
] as const;

export function ReactionButtons({ nodeId, reactions, variant = "compact" }: ReactionButtonsProps) {
  const mutation = useToggleReaction(nodeId);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5">
        {reactionMeta.map(({ key, icon: Icon, color, bg }) => {
          const reaction = reactions[key];
          const isActive = reaction.is_reacted;
          return (
            <button
              key={key}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                mutation.mutate(key);
              }}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs active:scale-90 transition-transform ${
                isActive
                  ? `${bg} ${color}`
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon size={14} className={isActive ? "fill-current" : ""} />
              {reaction.count > 0 && <span>{reaction.count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return <DetailReactionButtons nodeId={nodeId} reactions={reactions} mutation={mutation} />;
}

function DetailReactionButtons({
  nodeId,
  reactions,
  mutation,
}: {
  nodeId: string;
  reactions: Reactions;
  mutation: ReturnType<typeof useToggleReaction>;
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<ReactionType>("like");

  const openDrawer = useCallback(
    (type: ReactionType) => {
      setDrawerType(type);
      setDrawerOpen(true);
    },
    [],
  );

  const likeLongPress = useLongPress({ onLongPress: () => openDrawer("like") });
  const interestedLongPress = useLongPress({ onLongPress: () => openDrawer("interested") });
  const wantToTryLongPress = useLongPress({ onLongPress: () => openDrawer("want_to_try") });

  const longPressHandlers = {
    like: likeLongPress,
    interested: interestedLongPress,
    want_to_try: wantToTryLongPress,
  } as const;

  return (
    <>
      <div className="flex items-center gap-3">
        {reactionMeta.map(({ key, icon: Icon, label, color }) => {
          const reaction = reactions[key];
          const isActive = reaction.is_reacted;
          const lp = longPressHandlers[key];
          return (
            <div key={key} className="flex flex-col items-center">
              <button
                {...(isMobile
                  ? {
                      onTouchStart: lp.onTouchStart,
                      onTouchMove: lp.onTouchMove,
                      onTouchEnd: lp.onTouchEnd,
                    }
                  : {})}
                onClick={(e) => {
                  if (isMobile) {
                    lp.onClick(e);
                    if (e.defaultPrevented) return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  mutation.mutate(key);
                }}
                className={`flex flex-col items-center active:scale-90 transition-transform ${
                  isActive ? color : "text-muted-foreground"
                }`}
              >
                <Icon size={20} className={isActive ? "fill-current" : ""} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDrawer(key);
                }}
                className={`mt-0.5 flex items-center gap-0.5 hover:underline ${
                  isActive ? color : "text-muted-foreground"
                }`}
              >
                <span className="text-[10px]">{label}</span>
                {reaction.count > 0 && (
                  <span className="text-[10px] font-medium">{reaction.count}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <ReactionUsersDrawer
        nodeId={nodeId}
        reactions={reactions}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialType={drawerType}
      />
    </>
  );
}
