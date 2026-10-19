import { config } from "@dotenvx/dotenvx";

config({ path: [".env.local", ".env"], quiet: true, ignore: ["MISSING_ENV_FILE"] });
