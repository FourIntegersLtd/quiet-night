import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { DrawerMenu } from "@/components/DrawerMenu";

type DrawerContextValue = {
  openDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within DrawerProvider");
  return ctx;
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const openDrawer = useCallback(() => setVisible(true), []);

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      <DrawerMenu visible={visible} onClose={() => setVisible(false)} />
      {children}
    </DrawerContext.Provider>
  );
}
