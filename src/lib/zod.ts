import { parseISO } from "date-fns";
import { string } from "zod";

export function monthDate() {
  return string().transform((monthString) => parseISO(monthString));
}
