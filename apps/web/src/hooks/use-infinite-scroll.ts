import { useRef, useEffect, useCallback } from "react";

export function useInfiniteScroll(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
) {
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
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return sentinelRef;
}
