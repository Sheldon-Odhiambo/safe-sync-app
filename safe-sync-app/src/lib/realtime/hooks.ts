import { useEffect, useRef, useState } from "react";

import { useRealtime } from "./real-time-provider";
import { DispatchOfferPayload, ServerEvent } from "./types";

export function useChannel(channel: string | null, onEvent: (event: ServerEvent) => void) {
  const { client } = useRealtime();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!channel) return;
    client.subscribe(channel);
    const off = client.onChannel(channel, (e) => handlerRef.current(e));
    return () => {
      off();
      client.unsubscribe(channel);
    };
  }, [channel, client]);
}

export function useEventType(type: string, onEvent: (event: ServerEvent) => void) {
  const { client } = useRealtime();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    return client.on(type, (e) => handlerRef.current(e));
  }, [type, client]);
}

export function useDispatchOffers() {
  const { client } = useRealtime();
  const [offer, setOffer] = useState<DispatchOfferPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEventType("dispatch.created", (e) => {
    setOffer(e.payload as DispatchOfferPayload);
  });
  useEventType("dispatch.expired", (e) => {
    setOffer((current) =>
      current && e.payload.dispatch_id === current.dispatch_id ? null : current
    );
  });
  useEventType("dispatch.cancelled", (e) => {
    setOffer((current) =>
      current && e.payload.dispatch_id === current.dispatch_id ? null : current
    );
  });

  const accept = async (offerId: string) => {
    setBusy(true);
    try {
      await client.acceptDispatch(offerId);
      setOffer(null);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (offerId: string, reason?: string) => {
    setBusy(true);
    try {
      await client.rejectDispatch(offerId, reason);
      setOffer(null);
    } finally {
      setBusy(false);
    }
  };

  return { offer, busy, accept, reject };
}

/**
 * Tracks presence of a single responder on their own channel — useful for
 * an org/branch dashboard watching a specific responder.
 */
export function useResponderPresence(responderId: string | null) {
  const [online, setOnline] = useState<boolean | null>(null);

  useChannel(responderId ? `responder:${responderId}` : null, (e) => {
    if (e.type === "responder.connected") setOnline(true);
    if (e.type === "responder.disconnected") setOnline(false);
  });

  return online;
}