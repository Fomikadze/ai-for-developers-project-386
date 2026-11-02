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
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  bookingsCreateMutation,
  getOwnerOptions,
  meetingTypesListOptions,
  meetingTypesListSlotsQueryKey,
} from '../../api/generated/@tanstack/react-query.gen';
import { bookingFormSchema, fieldErrorCode } from '../../lib/bookingForm';
import { loadDraft, saveDraft, type GuestDraft } from '../../lib/draft';
import { errorText } from '../../lib/errors';
import { formatSlot } from '../../lib/format';

const fields = ['guestName', 'guestEmail', 'guestPhone'] as const;
const validateSchema = zod4Resolver(bookingFormSchema);

export function BookConfirmPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { meetingTypeId = '' } = useParams();
  const [params] = useSearchParams();
  const startParam = params.get('start');
  const start =
    startParam && !Number.isNaN(Date.parse(startParam)) ? new Date(startParam).toISOString() : null;

  const owner = useQuery(getOwnerOptions());
  const types = useQuery(meetingTypesListOptions());
  const type = types.data?.find((item) => item.id === meetingTypeId);

  const form = useForm<GuestDraft>({
    initialValues: loadDraft(meetingTypeId) ?? {
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      notes: '',
    },
    // Сообщения zod заменяются переводами `errors.<code>`: бэкенд и фронтенд говорят одно и то же.
    validate: (values) => {
      const errors = validateSchema(values);
      return Object.fromEntries(
        Object.keys(errors).map((key) => [
          key,
          errorText(i18n, fieldErrorCode[key as keyof typeof fieldErrorCode]),
        ]),
      );
    },
  });

  const create = useMutation({
    ...bookingsCreateMutation(),
    onSuccess: (booking) => {
      void navigate('/book/success', { state: { booking } });
    },
    onError: async (error) => {
      const code = (error as { code?: unknown }).code;
      const field = fields.find((name) => fieldErrorCode[name] === code);
      if (field) {
        form.setFieldError(field, errorText(i18n, code));
        return;
      }
      notifications.show({ color: 'red', message: errorText(i18n, code) });
      if (code === 'SLOT_TAKEN') {
        saveDraft(meetingTypeId, form.getValues());
        await queryClient.invalidateQueries({
          queryKey: meetingTypesListSlotsQueryKey({ path: { id: meetingTypeId } }),
        });
        void navigate(`/book/${meetingTypeId}`);
      }
    },
  });

  if (!start) return <Navigate to={`/book/${meetingTypeId}`} replace />;

  const failure = owner.error ?? types.error;
  if (failure) {
    return (
      <Container size="md" py={56}>
        <Alert color="red" role="alert">
          {errorText(i18n, (failure as { code?: unknown }).code)}
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
  if (!type || !owner.data) {
    return (
      <Container size="md" py={56}>
        <Loader />
      </Container>
    );
  }

  const submit = form.onSubmit((values) => {
    const parsed = bookingFormSchema.parse(values);
    saveDraft(meetingTypeId, values);
    create.mutate({
      body: {
        meetingTypeId,
        start,
        guestName: parsed.guestName,
        guestEmail: parsed.guestEmail,
        guestPhone: parsed.guestPhone,
        ...(parsed.notes ? { notes: parsed.notes } : {}),
      },
    });
  });

  return (
    <Container size="md" py={56}>
      <Card padding="lg">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          <Stack gap="xs" data-testid="booking-summary">
            <Title order={2} size="h3">
              {type.title}
            </Title>
            <Text c="dimmed">{type.description}</Text>
            <Text>{t('meetingType.duration', { count: type.durationMinutes })}</Text>
            <Text fw={500}>{formatSlot(start, owner.data.timezone, i18n.language)}</Text>
          </Stack>
          <form onSubmit={submit} noValidate>
            <Stack>
              <TextInput
                label={t('confirm.name')}
                autoComplete="name"
                withAsterisk
                {...form.getInputProps('guestName')}
              />
              <TextInput
                label={t('confirm.email')}
                type="email"
                autoComplete="email"
                withAsterisk
                {...form.getInputProps('guestEmail')}
              />
              <TextInput
                label={t('confirm.phone')}
                type="tel"
                autoComplete="tel"
                placeholder="+7 700 123 45 67"
                withAsterisk
                {...form.getInputProps('guestPhone')}
              />
              <Textarea label={t('confirm.notes')} minRows={3} {...form.getInputProps('notes')} />
              <Group justify="space-between">
                <Button variant="default" component={Link} to={`/book/${meetingTypeId}`}>
                  {t('slots.back')}
                </Button>
                <Button type="submit" loading={create.isPending}>
                  {t('confirm.submit')}
                </Button>
              </Group>
            </Stack>
          </form>
        </SimpleGrid>
      </Card>
    </Container>
  );
}
