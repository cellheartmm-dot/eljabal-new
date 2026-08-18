import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://upmdhlbipjzjiinxsmei.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwbWRobGJpcGp6amlpbnhzbWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODA4NDUsImV4cCI6MjEwMDc1Njg0NX0.m2uOp_pd-P1SmnGeVqiuJWyRO-g784wPZrxk6O6RVpM";

const envUrl = import.meta.env.VITE_SUPABASE_URL as string;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabaseUrl = envUrl && envUrl.startsWith("http") ? envUrl : DEFAULT_URL;
const supabaseAnonKey = envKey && envKey.startsWith("eyJ") ? envKey : DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
