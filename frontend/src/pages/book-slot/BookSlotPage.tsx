import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DatePicker, DatesProvider } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ru';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import {
  getOwnerOptions,
  meetingTypesListOptions,
  meetingTypesListSlotsOptions,
} from '../../api/generated/@tanstack/react-query.gen';
import { SlotList } from '../../components/SlotList';
import { errorText } from '../../lib/errors';
import { bookingWindow, groupSlotsByDay } from '../../lib/slots';

export function BookSlotPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { meetingTypeId = '' } = useParams();
  const owner = useQuery(getOwnerOptions());
  const types = useQuery(meetingTypesListOptions());
  const type = types.data?.find((item) => item.id === meetingTypeId);
  const slots = useQuery({
    ...meetingTypesListSlotsOptions({ path: { id: meetingTypeId } }),
    enabled: Boolean(type),
  });
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);

  const tz = owner.data?.timezone;
  const days = useMemo(
    () => (tz && slots.data ? groupSlotsByDay(slots.data, tz) : {}),
    [slots.data, tz],
  );

  const failure = owner.error ?? types.error ?? slots.error;
  if (failure) {
    const code = (failure as { code?: unknown }).code;
    return (
      <Container size="md" py={56}>
        <Alert color="red" role="alert">
          {errorText(i18n, code)}
        </Alert>
      </Container>
    );
  }
  if (types.data && !type) {
    return (
      <Container size="md" py={56}>
        <Stack align="flex-start">
          <Title order={2}>{t('slots.typeNotFound')}</Title>
          <Button component={Link} to="/book">
            {t('slots.toCatalog')}
          </Button>
        </Stack>
      </Container>
    );
  }
  if (!type || !tz || !slots.data) {
    return (
      <Container size="md" py={56}>
        <Loader />
      </Container>
    );
  }

  const { min, max } = bookingWindow(tz);
  const dayLabel = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).format(
      dayjs(value).toDate(),
    );
  const selectedTime = start ? dayjs(start).tz(tz).format('HH:mm') : null;

  return (
    <Container size="lg" py={56}>
      <Card padding="lg">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          <Stack gap="xs" data-testid="booking-summary">
            <Title order={2} size="h3">
              {type.title}
            </Title>
            <Text c="dimmed">{type.description}</Text>
            <Text>{t('meetingType.duration', { count: type.durationMinutes })}</Text>
            <Text fw={500}>
              {day ? dayLabel(day) : t('slots.pickDate')}
              {selectedTime && `, ${selectedTime}`}
            </Text>
          </Stack>
          <DatesProvider settings={{ locale: i18n.language, firstDayOfWeek: 1 }}>
            <DatePicker
              value={day}
              onChange={(value) => {
                setDay(value);
                setStart(null);
              }}
              defaultDate={min}
              minDate={min}
              maxDate={max}
              excludeDate={(value) => !days[value]}
              previousLabel={t('slots.previousMonth')}
              nextLabel={t('slots.nextMonth')}
              getDayProps={(value) => ({
                'aria-label': days[value]
                  ? t('slots.dayLabel', { date: dayLabel(value), count: days[value].length })
                  : dayLabel(value),
              })}
              renderDay={(value) => (
                <Stack gap={0} align="center">
                  <span>{dayjs(value).date()}</span>
                  {days[value] && <Text size="xs">{days[value].length}</Text>}
                </Stack>
              )}
            />
          </DatesProvider>
          <Stack>
            {day ? (
              <SlotList times={days[day] ?? []} selected={start} onSelect={setStart} />
            ) : (
              <Text c="dimmed">{t('slots.pickDate')}</Text>
            )}
          </Stack>
        </SimpleGrid>
        <Group justify="space-between" mt="xl">
          <Button variant="default" onClick={() => void navigate('/book')}>
            {t('slots.back')}
          </Button>
          <Button
            disabled={!start}
            onClick={() =>
              void navigate(
                `/book/${meetingTypeId}/confirm?start=${encodeURIComponent(new Date(start!).toISOString())}`,
              )
            }
          >
            {t('slots.continue')}
          </Button>
        </Group>
      </Card>
    </Container>
  );
}
