import { Button, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SlotTime } from '../lib/slots';

export function SlotList({
  times,
  selected,
  onSelect,
}: {
  times: SlotTime[];
  selected: string | null;
  onSelect: (start: string) => void;
}) {
  const { t } = useTranslation();
  if (times.length === 0) return <Text c="dimmed">{t('slots.none')}</Text>;
  return (
    <Stack gap="xs">
      {times.map(({ start, label }) => (
        <Button
          key={start}
          variant={start === selected ? 'filled' : 'default'}
          onClick={() => onSelect(start)}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
}
