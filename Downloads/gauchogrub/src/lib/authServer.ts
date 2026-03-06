import { NextRequest } from 'next/server';
import { admin } from './supabaseAdmin';

export interface AuthUser {
  id:    string;
  email: string;
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Throws with a human-readable message on failure.
 */
export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new Error('Authentication required');

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Session expired — please log in again');

  const email = data.user.email ?? '';
  const isDev = process.env.APP_ENV !== 'production';
  if (!isDev && !email.endsWith('@ucsb.edu')) {
    throw new Error('Only @ucsb.edu accounts are allowed');
  }

  return { id: data.user.id, email };
}
