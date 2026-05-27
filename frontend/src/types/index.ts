export type UUID = string;

export type UserRole = "admin" | "user";

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface User {
  id: UUID;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  trial_ends_at: string | null;
  created_at: string;
  profile?: UserProfile | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  pending_verification?: boolean;
  dev_code?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "cancelled"
  | "expired"
  | "past_due";

export interface Plan {
  id: UUID;
  name: string;
  price: string;
  currency: string;
  interval: "month" | "year";
  features: string[];
  sort_order: number;
}

export interface Subscription {
  id: UUID;
  plan_id: UUID | null;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
}

export interface Payment {
  id: UUID;
  amount: string;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  provider: "robokassa" | "stripe";
  created_at: string;
}

export interface ReferralStats {
  total_referred: number;
  converted: number;
  total_earned: string;
  pending_payout: string;
}

export interface MyReferralCode {
  code: string;
  url: string;
  stats: ReferralStats;
}

export interface ReferralPayout {
  id: UUID;
  amount: string;
  status: "pending" | "approved" | "paid" | "rejected";
  paid_at: string | null;
  created_at: string;
}

export interface ApiKey {
  id: UUID;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  full_key: string;
}

export interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  mrr: string;
  pending_payouts: string;
}

export interface ReferralUser {
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: "registered" | "trial" | "converted";
  created_at: string;
}
