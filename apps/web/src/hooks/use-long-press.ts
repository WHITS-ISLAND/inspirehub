import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  threshold?: number;
}

export function useLongPress({ onLongPress, threshold = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const onTouchMove = cancel;
  const onTouchEnd = cancel;

  const onClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, onClick };
}
