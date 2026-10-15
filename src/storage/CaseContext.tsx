import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CaseRecord } from "../domain/types";
import * as storage from "./database";
const Context = createContext<{
  records: CaseRecord[];
  ready: boolean;
  persistent: boolean;
  error: string;
  refresh: () => Promise<void>;
}>({
  records: [],
  ready: false,
  persistent: true,
  error: "",
  refresh: async () => {},
});
export function CaseProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<CaseRecord[]>([]),
    [ready, setReady] = useState(false),
    [persistent, setPersistent] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    try {
      setRecords(await storage.listCases());
      setError("");
    } catch {
      setError(
        "저장된 기록을 읽을 수 없습니다. 페이지를 새로 열거나 JSON 백업을 확인해 주세요.",
      );
    }
  }
  useEffect(() => {
    let active = true;
    void storage.openStorage().then(async (ok) => {
      if (!active) return;
      setPersistent(ok);
      await refresh();
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Context.Provider value={{ records, ready, persistent, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useCases() {
  return useContext(Context);
}
