'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

interface CountdownTimerProps {
  deadline: Date | string | number;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(deadline: Date): TimeRemaining {
  const now = Date.now();
  const target = deadline.getTime();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / 1000 / 60 / 60) % 24);
  const days = Math.floor(total / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, total };
}

function formatTimeRemaining(time: TimeRemaining): string {
  if (time.total <= 0) {
    return 'abgelaufen';
  }

  const parts: string[] = [];

  if (time.days > 0) {
    parts.push(`${time.days} ${time.days === 1 ? 'Tag' : 'Tage'}`);
  }

  if (time.hours > 0 || time.days > 0) {
    parts.push(`${time.hours}h`);
  }

  // Show minutes only if less than 1 day remaining
  if (time.days === 0 && time.minutes > 0) {
    parts.push(`${time.minutes}min`);
  }

  // Show seconds only if less than 1 hour remaining
  if (time.days === 0 && time.hours === 0 && time.seconds > 0) {
    parts.push(`${time.seconds}s`);
  }

  return `noch ${parts.join(' ')}`;
}

function getColorClass(time: TimeRemaining): string {
  if (time.total <= 0) {
    return 'text-(--text-muted)';
  }

  const hoursRemaining = time.total / 1000 / 60 / 60;

  if (hoursRemaining < 1) {
    return 'text-red-400';
  }

  if (hoursRemaining < 24) {
    return 'text-yellow-400';
  }

  return 'text-(--text-muted)';
}

export const CountdownTimer = memo(function CountdownTimer({
  deadline,
  className = '',
}: CountdownTimerProps) {
  const deadlineDate = useMemo(() => {
    if (deadline instanceof Date) return deadline;
    return new Date(deadline);
  }, [deadline]);

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadlineDate)
  );

  const updateTime = useCallback(() => {
    setTimeRemaining(calculateTimeRemaining(deadlineDate));
  }, [deadlineDate]);

  useEffect(() => {
    // Determine update interval based on remaining time
    const getInterval = () => {
      const remaining = calculateTimeRemaining(deadlineDate);
      if (remaining.total <= 0) return null; // Stop updating
      if (remaining.days === 0 && remaining.hours === 0) return 1000; // Every second
      return 60000; // Every minute
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const setupInterval = () => {
      const interval = getInterval();
      if (intervalId) clearInterval(intervalId);
      if (interval) {
        intervalId = setInterval(() => {
          updateTime();
          // Re-check if we need to change update frequency
          const newInterval = getInterval();
          if (newInterval !== interval) {
            setupInterval();
          }
        }, interval);
      }
    };

    setupInterval();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [deadlineDate, updateTime]);

  const colorClass = useMemo(() => getColorClass(timeRemaining), [timeRemaining]);
  const formattedTime = useMemo(() => formatTimeRemaining(timeRemaining), [timeRemaining]);

  return <span className={`text-sm ${colorClass} ${className}`}>{formattedTime}</span>;
});
