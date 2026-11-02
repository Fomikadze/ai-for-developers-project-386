import { Alert, Card, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  bookingsListUpcomingOptions,
  getOwnerOptions,
} from '../../api/generated/@tanstack/react-query.gen';
import { errorText } from '../../lib/errors';
import { formatSlot } from '../../lib/format';

export function UpcomingTab() {
  const { t, i18n } = useTranslation();
  const owner = useQuery(getOwnerOptions());
  const list = useQuery(bookingsListUpcomingOptions());

  const error = (list.error ?? owner.error) as { code?: unknown } | null;

  if (error) {
    return (
      <Alert color="red" role="alert" mt="lg">
        {errorText(i18n, error.code)}
      </Alert>
    );
  }
  if (list.isPending || owner.isPending) return <Loader mt="lg" />;
  if (list.data.length === 0) {
    return (
      <Text c="dimmed" mt="lg">
        {t('admin.upcoming.empty')}
      </Text>
    );
  }

  return (
    <Stack component="ul" gap="md" mt="lg" p={0} style={{ listStyle: 'none' }}>
      {list.data.map((booking) => (
        <Card component="li" key={booking.id} padding="md">
          <Text fw={500}>{booking.meetingType.title}</Text>
          <Text size="sm">{formatSlot(booking.start, owner.data.timezone, i18n.language)}</Text>
          <Text size="sm">{booking.guestName}</Text>
          <Text size="sm" c="dimmed">
            {booking.guestEmail}
          </Text>
          <Text size="sm" c="dimmed">
            {booking.guestPhone}
          </Text>
          {booking.notes ? <Text size="sm">{booking.notes}</Text> : null}
        </Card>
      ))}
    </Stack>
  );
}
