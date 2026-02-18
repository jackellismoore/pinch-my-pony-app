'use client';

import { useMemo } from 'react';
import { useHorseAvailability, hasOverlapInclusive } from '@/app/dashboard/owner/hooks/useHorseAvailability';

export function AvailabilityConflictNotice(props: {
  horseId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onConflictChange?: (hasConflict: boolean) => void;
}) {
  const { horseId, startDate, endDate, onConflictChange } = props;

  const { unavailableRanges, loading, error } = useHorseAvailability(horseId);

  const conflict = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (startDate > endDate) return false;

    return hasOverlapInclusive(
      startDate,
      endDate,
      unavailableRanges.map((r) => ({ startDate: r.startDate, endDate: r.endDate }))
    );
  }, [startDate, endDate, unavailableRanges]);

  // Notify parent (optional)
  useMemo(() => {
    onConflictChange?.(conflict || loading);
    // include loading as "conflict-like" if you want to disable submit until loaded
  }, [conflict, loading, onConflictChange]);

  if (error) {
    return (
      <div style={{ fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>
        Availability check failed: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
        Checking availability…
      </div>
    );
  }

  if (!startDate || !endDate) return null;

  if (conflict) {
    return (
      <div style={{ fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>
        Those dates overlap an unavailable range. Please choose different dates.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
      Dates look available.
    </div>
  );
}
