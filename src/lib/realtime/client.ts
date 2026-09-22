import { AppState, AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase"; // ADAPT: your Supabase client

import {
  COMMAND_TIMEOUT_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  WS_PATH,
  wsBaseUrl,
} from "./config";
import { ClientEnvelope, ConnectionState, ErrorEvent, ServerEvent } from "./types";

// Optional: only used if the package is installed. Falls back to
// "assume online" if it isn't, so this file has no hard dependency on it.
let NetInfo: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require("@react-native-community/netinfo").default;
} catch {
  /* not installed; reconnect logic still works off socket events + AppState */
}

type EventHandler = (event: ServerEvent) => void;
type StateHandler = (state: ConnectionState) => void;

type PendingCommand = {
  resolve: (event: ServerEvent) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "closed";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosedAt: number | null = null;
  private wantsConnection = false;

  private subscribedChannels = new Set<string>();
  private pendingCommands = new Map<string, PendingCommand>();

  // Listeners keyed by event `type` ("*" = all events)
  private typeListeners = new Map<string, Set<EventHandler>>();
  // Listeners keyed by `channel`
  private channelListeners = new Map<string, Set<EventHandler>>();
  private stateListeners = new Set<StateHandler>();

  constructor() {
    AppState.addEventListener("change", this.handleAppStateChange);
    if (NetInfo) {
      NetInfo.addEventListener((s: any) => {
        if (s.isConnected && this.wantsConnection && this.state === "closed") {
          this.reconnectAttempt = 0;
          this.connect();
        }
      });
    }
  }

  // ---------------------------------------------------------------- public

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateListeners.add(handler);
    return () => this.stateListeners.delete(handler);
  }

  /** Listen for a specific server event `type` ("*" for everything). */
  on(type: string, handler: EventHandler): () => void {
    if (!this.typeListeners.has(type)) this.typeListeners.set(type, new Set());
    this.typeListeners.get(type)!.add(handler);
    return () => this.typeListeners.get(type)?.delete(handler);
  }

  /** Listen for events broadcast on a specific channel. */
  onChannel(channel: string, handler: EventHandler): () => void {
    if (!this.channelListeners.has(channel)) this.channelListeners.set(channel, new Set());
    this.channelListeners.get(channel)!.add(handler);
    return () => this.channelListeners.get(channel)?.delete(handler);
  }

  async connect(): Promise<void> {
    this.wantsConnection = true;
    if (this.state === "open" || this.state === "connecting") return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      // No session yet; try again shortly rather than failing hard.
      this.scheduleReconnect();
      return;
    }

    this.setState("connecting");
    const url = `${wsBaseUrl()}${WS_PATH}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      // connection.ready arrives as a message; state flips to "open" there.
    };

    ws.onmessage = (evt) => this.handleMessage(evt.data);

    ws.onerror = () => {
      /* onclose follows; nothing extra to do here */
    };

    ws.onclose = () => {
      this.clearHeartbeatTimer();
      this.rejectAllPending(new Error("Connection closed"));
      this.setState("closed");
      if (this.wantsConnection) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.wantsConnection = false;
    this.reconnectAttempt = 0;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.clearHeartbeatTimer();
    this.manuallyClosedAt = Date.now();
    this.ws?.close();
    this.ws = null;
    this.setState("closed");
  }

  /** Fire-and-forget: duplicates are harmless (location, presence, etc). */
  send(type: string, payload: Record<string, any> = {}): void {
    this.rawSend({ type, payload });
  }

  /**
   * Server-authoritative command. Resolves with the matching response event
   * (matched by request_id) or rejects on error/timeout. Safe to retry —
   * dispatch accept/reject are idempotent server-side.
   */
  command(type: string, payload: Record<string, any> = {}): Promise<ServerEvent> {
    const request_id = genId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(request_id);
        reject(new Error(`Timed out waiting for response to "${type}"`));
      }, COMMAND_TIMEOUT_MS);

      this.pendingCommands.set(request_id, { resolve, reject, timer });
      this.rawSend({ type, request_id, payload });
    });
  }

  async subscribe(channel: string): Promise<void> {
    this.subscribedChannels.add(channel); // re-added on every (re)connect regardless of result
    if (this.state !== "open") return; // will be sent by resubscribeAll() once open
    try {
      await this.command("subscribe", { channel });
    } catch {
      /* server logs the denial; caller's onChannel simply never fires */
    }
  }

  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel);
    if (this.state === "open") this.send("unsubscribe", { channel });
  }

  sendLocationUpdate(payload: Record<string, any>): void {
    this.send("location.update", payload);
  }

  acceptDispatch(offerId: string): Promise<ServerEvent> {
    return this.command("dispatch.accept", { offer_id: offerId });
  }

  rejectDispatch(offerId: string, reason?: string): Promise<ServerEvent> {
    return this.command("dispatch.reject", { offer_id: offerId, reason });
  }

  // --------------------------------------------------------------- internal

  private rawSend(envelope: ClientEnvelope): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
  }

  private handleMessage(raw: string): void {
    let event: ServerEvent | ErrorEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.type === "connection.ready") {
      this.setState("open");
      this.reconnectAttempt = 0;
      this.resetHeartbeatTimer();
      this.resubscribeAll();
      this.dispatch(event as ServerEvent);
      return;
    }

    if (event.type === "ping") {
      this.resetHeartbeatTimer();
      this.rawSend({ type: "pong" });
      return;
    }

    if (event.type === "error") {
      const err = event as ErrorEvent;
      if (err.request_id && this.pendingCommands.has(err.request_id)) {
        const p = this.pendingCommands.get(err.request_id)!;
        clearTimeout(p.timer);
        this.pendingCommands.delete(err.request_id);
        p.reject(new Error(`${err.code}: ${err.message}`));
        return;
      }
      this.dispatch(event as unknown as ServerEvent);
      return;
    }

    const se = event as ServerEvent;
    this.resetHeartbeatTimer(); // any traffic counts as liveness

    if (se.request_id && this.pendingCommands.has(se.request_id)) {
      const p = this.pendingCommands.get(se.request_id)!;
      clearTimeout(p.timer);
      this.pendingCommands.delete(se.request_id);
      p.resolve(se);
      // fall through: still notify channel/type listeners for UI updates
    }

    this.dispatch(se);
  }

  private dispatch(event: ServerEvent): void {
    this.typeListeners.get(event.type)?.forEach((h) => h(event));
    this.typeListeners.get("*")?.forEach((h) => h(event));
    if (event.channel) this.channelListeners.get(event.channel)?.forEach((h) => h(event));
  }

  private resubscribeAll(): void {
    for (const channel of this.subscribedChannels) {
      this.command("subscribe", { channel }).catch(() => {});
    }
  }

  private resetHeartbeatTimer(): void {
    this.clearHeartbeatTimer();
    this.heartbeatTimer = setTimeout(() => {
      // No ping/traffic within the window: treat as stale and force a reconnect.
      this.ws?.close();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return; // already scheduled
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wantsConnection) this.connect();
    }, delay);
  }

  private rejectAllPending(err: Error): void {
    for (const [, p] of this.pendingCommands) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pendingCommands.clear();
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((h) => h(state));
  }

  private handleAppStateChange = (next: AppStateStatus) => {
    if (next === "active" && this.wantsConnection && this.state === "closed") {
      this.reconnectAttempt = 0;
      this.connect();
    }
    // Going to background does NOT close the socket — some time on iOS/Android
    // the OS will suspend the connection anyway, and onclose handles that.
  };
}

export const realtimeClient = new RealtimeClient();