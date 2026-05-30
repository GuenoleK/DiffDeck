import process from "node:process";
import { TextDecoder } from "node:util";
import type { Readable, Writable } from "node:stream";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessageSchema, type JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const windows1252CodePoints = new Map<number, number>([
  [0x80, 0x20ac],
  [0x82, 0x201a],
  [0x83, 0x0192],
  [0x84, 0x201e],
  [0x85, 0x2026],
  [0x86, 0x2020],
  [0x87, 0x2021],
  [0x88, 0x02c6],
  [0x89, 0x2030],
  [0x8a, 0x0160],
  [0x8b, 0x2039],
  [0x8c, 0x0152],
  [0x8e, 0x017d],
  [0x91, 0x2018],
  [0x92, 0x2019],
  [0x93, 0x201c],
  [0x94, 0x201d],
  [0x95, 0x2022],
  [0x96, 0x2013],
  [0x97, 0x2014],
  [0x98, 0x02dc],
  [0x99, 0x2122],
  [0x9a, 0x0161],
  [0x9b, 0x203a],
  [0x9c, 0x0153],
  [0x9e, 0x017e],
  [0x9f, 0x0178],
]);

class TolerantReadBuffer {
  private buffer: Buffer | undefined;

  append(chunk: Buffer): void {
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
  }

  readMessage(): JSONRPCMessage | null {
    if (!this.buffer) {
      return null;
    }

    const index = this.buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }

    const lineBuffer = this.buffer.subarray(0, index);
    this.buffer = this.buffer.subarray(index + 1);
    const line = decodeJsonRpcLine(lineBuffer).replace(/\r$/, "");
    return JSONRPCMessageSchema.parse(JSON.parse(line));
  }

  clear(): void {
    this.buffer = undefined;
  }
}

function decodeJsonRpcLine(lineBuffer: Buffer): string {
  try {
    return utf8Decoder.decode(lineBuffer);
  } catch {
    return decodeWindows1252(lineBuffer);
  }
}

function decodeWindows1252(lineBuffer: Buffer): string {
  return Array.from(lineBuffer, (byte) => String.fromCodePoint(windows1252CodePoints.get(byte) ?? byte)).join("");
}

export class TolerantStdioServerTransport implements Transport {
  private readonly readBuffer = new TolerantReadBuffer();
  private started = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly stdin: Readable = process.stdin,
    private readonly stdout: Writable = process.stdout,
  ) {}

  private readonly ondata = (chunk: Buffer) => {
    this.readBuffer.append(chunk);
    this.processReadBuffer();
  };

  private readonly onstreamerror = (error: Error) => {
    this.onerror?.(error);
  };

  async start(): Promise<void> {
    if (this.started) {
      throw new Error("TolerantStdioServerTransport already started");
    }

    this.started = true;
    this.stdin.on("data", this.ondata);
    this.stdin.on("error", this.onstreamerror);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    await new Promise<void>((resolve) => {
      const json = `${JSON.stringify(message)}\n`;

      if (this.stdout.write(json)) {
        resolve();
        return;
      }

      this.stdout.once("drain", resolve);
    });
  }

  async close(): Promise<void> {
    this.stdin.off("data", this.ondata);
    this.stdin.off("error", this.onstreamerror);

    if (this.stdin.listenerCount("data") === 0) {
      this.stdin.pause();
    }

    this.readBuffer.clear();
    this.onclose?.();
  }

  private processReadBuffer(): void {
    while (true) {
      try {
        const message = this.readBuffer.readMessage();
        if (message === null) {
          break;
        }

        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}
