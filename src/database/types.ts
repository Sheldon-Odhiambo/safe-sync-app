export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  account_type: string | null;
  organization_id: string | null;
  branch_id: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  updated_at: string;
};

export type Branch = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
};

export type ActiveEmergency = {
  id: string;
  requester_id: string;
  service_type: "fire" | "ambulance";
  status: string;

  responder_id: string | null;

  origin_latitude: number;
  origin_longitude: number;
  origin_address: string | null;

  estimated_distance_meters: number | null;
  estimated_duration_seconds: number | null;
  estimated_price: number | null;

  created_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  updated_at: string;
};