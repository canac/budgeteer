import { useState } from "react";

export function useToday(): Date {
  const [today] = useState(() => new Date());
  return today;
}
