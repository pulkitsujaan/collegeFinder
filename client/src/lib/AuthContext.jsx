import { createContext, useCallback, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api, { ApiError } from '../api/client.js';
import { useShortlist } from './ShortlistContext.jsx';

const AuthContext = createContext(null);

/**
 * Auth-lite.
 *
 * The session is a JWT in an httpOnly cookie, so the client never sees the
 * token — `GET /api/auth/me` is the only source of truth for who is signed in.
 * The shortlist lives in localStorage either way; signing in pushes the local
 * list to the server and then adopts whatever comes back, so nothing is lost
 * and two browsers converge on the union.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const shortlist = useShortlist();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => api.me({ signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const user = me.data?.user ?? null;

  /** Local slugs first, then adopt the server's list — the union of both. */
  const syncShortlist = useCallback(async () => {
    const local = shortlist.items.map((item) => item.slug);

    for (const slug of local) {
      // A slug the catalogue has dropped is not worth failing a sign-in over.
      await api.addToShortlist(slug).catch(() => {});
    }

    const { items } = await api.shortlist();
    shortlist.replaceAll(items);
    queryClient.invalidateQueries({ queryKey: ['shortlist'] });
  }, [shortlist, queryClient]);

  const login = useMutation({
    mutationFn: (credentials) => api.login(credentials),
    onSuccess: async (data) => {
      queryClient.setQueryData(['me'], data);
      await syncShortlist();
    },
  });

  const register = useMutation({
    mutationFn: (payload) => api.register(payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(['me'], data);
      await syncShortlist();
    },
  });

  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      // The local shortlist deliberately survives signing out.
      queryClient.setQueryData(['me'], { user: null });
      queryClient.removeQueries({ queryKey: ['shortlist'] });
    },
  });

  const value = useMemo(
    () => ({
      user,
      isLoading: me.isLoading,
      isSignedIn: Boolean(user),
      login,
      register,
      logout,
      refresh: me.refetch,
    }),
    [user, me.isLoading, me.refetch, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}

export { ApiError };
export default AuthProvider;
