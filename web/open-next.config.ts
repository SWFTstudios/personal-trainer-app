import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page reads live data from D1, so no incremental cache is configured.
export default defineCloudflareConfig({});
