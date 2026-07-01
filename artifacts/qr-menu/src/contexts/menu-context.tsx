import { createContext, useContext, ReactNode, useEffect } from "react";
import { useMenuData, MenuData, formatPrice, LANG_FLAGS, RTL_LANGS } from "@/hooks/use-menu-data";

interface MenuContextValue {
  menu: MenuData | null;
  lang: string;
  setLang: (l: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
  accent: string;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const value = useMenuData();

  useEffect(() => {
    document.documentElement.style.setProperty("--luna-accent", value.accent);
  }, [value.accent]);

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}

export { formatPrice, LANG_FLAGS, RTL_LANGS };
