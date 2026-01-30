'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
