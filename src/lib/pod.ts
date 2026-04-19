import os from "node:os";

export function podInfo() {
  return {
    hostname: process.env.HOSTNAME || os.hostname(),
    podIP: process.env.POD_IP || null,
    nodeName: process.env.NODE_NAME || null,
    namespace: process.env.POD_NAMESPACE || null,
    env: process.env.NODE_ENV,
    startedAt: process.env.POD_STARTED_AT || new Date().toISOString(),
  };
}
