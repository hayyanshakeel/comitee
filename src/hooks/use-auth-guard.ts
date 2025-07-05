'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

type GuardOptions = {
  role?: 'user' | 'admin';
};

export function useAuthGuard(options: GuardOptions = {}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait for auth state to be determined
    }

    if (!user) {
      router.replace('/');
      return;
    }

    if (options.role && userProfile?.role !== options.role) {
      // If role is required and doesn't match, redirect to user dashboard.
      router.replace('/dashboard'); 
    }

  }, [user, userProfile, loading, router, options.role]);

  return { user, userProfile, loading };
}
