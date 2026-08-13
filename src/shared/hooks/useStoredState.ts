import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function useStoredState(key: string, fallback: string): [string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState(() => localStorage.getItem(key) || fallback);
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return [value, setValue];
}
