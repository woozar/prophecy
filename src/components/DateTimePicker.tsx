'use client';

import { memo, useMemo, ReactNode } from 'react';
import { DateTimePicker as MantineDateTimePicker } from '@mantine/dates';
import { RequiredAsterisk } from './RequiredAsterisk';

export interface DateTimePickerProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value?: Date | null;
  onChange?: (value: Date | null) => void;
  error?: ReactNode;
  disabled?: boolean;
}

export const DateTimePicker = memo(function DateTimePicker({
  label,
  required,
  onChange,
  ...props
}: DateTimePickerProps) {
  const labelWithAsterisk: ReactNode = useMemo(() => {
    if (!label) return undefined;
    if (!required) return label;
    return (
      <>
        {label}
        <RequiredAsterisk />
      </>
    );
  }, [label, required]);

  return (
    <MantineDateTimePicker
      label={labelWithAsterisk}
      valueFormat="DD.MM.YYYY HH:mm"
      clearable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={onChange as any}
      classNames={{
        label: 'text-sm font-medium text-[#9fb3c8] mb-1.5',
      }}
      popoverProps={{
        classNames: {
          dropdown:
            '!bg-[rgba(10,25,41,0.98)] !border-cyan-400/30 !shadow-[0_0_20px_rgba(6,182,212,0.2)]',
        },
      }}
      styles={{
        calendarHeader: { background: 'transparent' },
        calendarHeaderLevel: { color: '#f0f4f8' },
        calendarHeaderControl: { color: '#9fb3c8' },
        weekday: { color: '#22d3ee' },
        day: { color: '#9fb3c8' },
        levelsGroup: { background: 'transparent' },
      }}
      clearButtonProps={{
        style: { color: '#9fb3c8' },
      }}
      {...props}
    />
  );
});
