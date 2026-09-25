export type ServerEvent = {
  type: string;
  event_id: string;
  timestamp: string;
  request_id?: string | null;
  channel?: string | null;
  payload: Record<string, any>;
};

export type ErrorEvent = {
  type: "error";
  request_id?: string | null;
  code: string;
  message: string;
  timestamp: string;
};

export type ClientEnvelope = {
  type: string;
  request_id?: string;
  channel?: string;
  payload?: Record<string, any>;
};

export type ConnectionState = "connecting" | "open" | "closed";

export type LocationUpdatePayload = {
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  altitude_meters?: number | null;
  speed_mps?: number | null;
  heading_degrees?: number | null;
  recorded_at: string; // ISO 8601 with timezone
};

export type DispatchOfferPayload = {
  dispatch_id: string;
  incident_id: string;
  emergency_type?: string;
  pickup_location?: { latitude: number; longitude: number };
  expires_at?: string;
  offer_id?: string;
};