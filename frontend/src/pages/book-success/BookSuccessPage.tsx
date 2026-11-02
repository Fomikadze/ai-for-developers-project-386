import { Button, Card, Container, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router';
import { getOwnerOptions } from '../../api/generated/@tanstack/react-query.gen';
import type { Booking } from '../../api/generated/types.gen';
import { clearDraft } from '../../lib/draft';
import { formatSlot } from '../../lib/format';

export function BookSuccessPage() {
  const { t, i18n } = useTranslation();
  const { state } = useLocation() as { state: { booking?: Booking } | null };
  const booking = state?.booking;
  const owner = useQuery({ ...getOwnerOptions(), enabled: Boolean(booking) });

  if (!booking) return <Navigate to="/book" replace />;
  clearDraft();
  if (!owner.data) {
    return (
      <Container size="sm" py={56}>
        <Loader />
      </Container>
    );
  }

  return (
    <Container size="sm" py={56}>
      <Card padding="lg">
        <Stack>
          <Title order={2}>{t('success.title')}</Title>
          <Text fw={500}>{booking.meetingType.title}</Text>
          <Text>{formatSlot(booking.start, owner.data.timezone, i18n.language)}</Text>
          <Button component={Link} to="/" w="fit-content">
            {t('notFound.home')}
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
