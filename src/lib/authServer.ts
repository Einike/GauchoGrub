import { NextRequest } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export async function requireUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) throw new Error("Missing auth token");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid auth token");
  const email = data.user.email || "";
  if (!email.endsWith("@ucsb.edu")) throw new Error("UCSB email required");
  return { id: data.user.id, email };
}
