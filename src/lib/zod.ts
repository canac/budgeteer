import { string } from "zod";

export function month() {
  return string().regex(/^\d{2}-\d{4}$/, "Invalid month format");
}
