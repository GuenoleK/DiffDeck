import { spawn } from "node:child_process";

const allowedProtocols = new Set(["http:", "https:"]);
export const openUrlIntentHeader = "x-diffdeck-intent";
export const openUrlIntentValue = "open-url";

export const parseOpenableUrl = (value: string): URL => {
  const url = new URL(value);

  if (!allowedProtocols.has(url.protocol)) {
    throw new Error("Only http and https URLs can be opened");
  }

  return url;
};

export const isLocalRequestHost = (host: string | undefined): boolean => {
  if (!host) {
    return false;
  }

  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
};

export const isLocalRequestOrigin = (origin: string | null): boolean => {
  if (!origin) {
    return false;
  }

  try {
    return isLocalRequestHost(new URL(origin).host);
  } catch {
    return false;
  }
};

export const isTrustedOpenUrlRequest = (headers: Headers): boolean => {
  const intent = headers.get(openUrlIntentHeader);
  const fetchSite = headers.get("sec-fetch-site");

  return intent === openUrlIntentValue && isLocalRequestOrigin(headers.get("origin")) && fetchSite !== "cross-site";
};

export const openUrlInDefaultBrowser = async (url: URL): Promise<void> => {
  const target = url.toString();
  const command = process.platform === "win32" ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", target] : [target];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
};
