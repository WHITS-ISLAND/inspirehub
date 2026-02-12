import { useState, useEffect } from "react";
import {
  createRoute,
  type AnyRootRoute,
  useNavigate,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useAuthStore } from "@/stores/auth";

const YARUO = `＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿
|　　　　　　　　　　　　　　　　　　　　　　　　　　|
|　 ログインするお！　　　　　　　　　　　 　　|
|　　　　　　　　　　　　　　　　　　　　　　　　　　|
￣￣￣￣￣￣∨￣￣￣￣￣￣￣￣￣￣
　　　　　　 ＿＿＿＿
　　　　　／　　　　　　　＼
　　　／　 ⌒　　　　⌒　　＼
　／　　 （●）　（●）　　　　 ＼
　|　　　　（__人__）　 　　　　　　|
　＼　　　　　　　　　　　　　 ／
　　ノ　　　　　　　　　　　　 ＼
　／´　　　　　　　　　　　　　｜
　|　　　ｌ　　　　　　　　 ｜`;

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [wasAuthOnMount] = useState(isAuthenticated);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (wasAuthOnMount) {
        void navigate({ to: "/" });
      } else {
        setIsTransitioning(true);
      }
    }
  }, [isAuthenticated, wasAuthOnMount, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background orbs */}
      <motion.div
        className="pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full opacity-[0.15] blur-[100px]"
        style={{ background: "#9ca3af" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-24 h-[360px] w-[360px] rounded-full opacity-[0.12] blur-[100px]"
        style={{ background: "#a1a1aa" }}
        animate={{ x: [0, -20, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-16 top-1/4 h-[240px] w-[240px] rounded-full opacity-[0.10] blur-[80px]"
        style={{ background: "#d4d4d8" }}
        animate={{ x: [0, -15, 0], y: [0, 25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ backgroundColor: "#d4d4d8" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="w-full max-w-sm px-6 md:max-w-lg"
        animate={
          isTransitioning
            ? {
                opacity: [1, 1, 0],
                scale: [1, 1.06, 1.2],
                filter: [
                  "blur(0px) brightness(1)",
                  "blur(0px) brightness(1.4)",
                  "blur(20px) brightness(1.4)",
                ],
              }
            : { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)" }
        }
        transition={{ duration: isTransitioning ? 0.8 : 0 }}
        onAnimationComplete={() => {
          if (isTransitioning) void navigate({ to: "/" });
        }}
      >
        {/* Brand + Yaruo */}
        <div className="flex items-end justify-between">
          {/* Brand */}
          <motion.div
            className="shrink-0 select-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Inspire
              <br />
              Hub
            </h1>
          </motion.div>

          {/* Yaruo */}
          <motion.pre
            className="shrink-0 select-none text-[9px] leading-[1.2] text-foreground/80 md:text-[11px]"
            style={{
              fontFamily: "'Mona','IPAMonaPGothic','MS PGothic',monospace",
            }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0, y: [0, -2, 0] }}
            transition={{
              opacity: { duration: 0.5, delay: 0.5 },
              x: { duration: 0.5, delay: 0.5 },
              y: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              },
            }}
          >
            {YARUO}
          </motion.pre>
        </div>

        {/* Login button */}
        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <GoogleLoginButton />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default (parentRoute: AnyRootRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/login",
    component: LoginPage,
  });
