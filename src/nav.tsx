import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Route = { name: string; params?: Record<string, unknown> };
export interface AlertSpec { title: string; message?: string; buttons?: { text: string; onPress?: () => void; primary?: boolean }[] }
export interface PromptSpec { message: string; onResult: (ok: boolean) => void }

interface NavCtx {
  route: Route;
  depth: number;
  navigate: (name: string, params?: Record<string, unknown>) => void;
  replace: (name: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  reset: (name: string) => void;
  alert: (a: AlertSpec) => void;
  biometric: (p: PromptSpec) => void;
  toast: (t: string) => void;
}

const Ctx = createContext<NavCtx | null>(null);

export function NavProvider({ children, render }: { children?: ReactNode; render: (route: Route, overlays: { alert: AlertSpec | null; prompt: PromptSpec | null; toast: string | null; closeAlert: () => void; closePrompt: () => void }) => ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'Splash' }]);
  const [alertSpec, setAlert] = useState<AlertSpec | null>(null);
  const [prompt, setPrompt] = useState<PromptSpec | null>(null);
  const [toastMsg, setToast] = useState<string | null>(null);

  const navigate = useCallback((name: string, params?: Record<string, unknown>) => {
    setStack((s) => {
      const i = s.findIndex((r) => r.name === name);
      if (i >= 0 && !params) return s.slice(0, i + 1);
      return [...s, { name, params }];
    });
  }, []);
  const replace = useCallback((name: string, params?: Record<string, unknown>) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);
  const goBack = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((name: string) => setStack([{ name }]), []);
  const toast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((c) => (c === t ? null : c)), 4200);
  }, []);

  const v = useMemo<NavCtx>(() => ({
    route: stack[stack.length - 1], depth: stack.length, navigate, replace, goBack, reset,
    alert: setAlert, biometric: setPrompt, toast,
  }), [stack, navigate, replace, goBack, reset, toast]);

  return (
    <Ctx.Provider value={v}>
      {render(stack[stack.length - 1], { alert: alertSpec, prompt, toast: toastMsg, closeAlert: () => setAlert(null), closePrompt: () => setPrompt(null) })}
      {children}
    </Ctx.Provider>
  );
}

export function useNav() {
  const c = useContext(Ctx);
  if (!c) throw new Error('NavProvider manquant');
  return c;
}
