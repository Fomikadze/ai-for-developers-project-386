import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  meetingTypesCreateMutation,
  meetingTypesListOptions,
  meetingTypesListQueryKey,
} from '../../api/generated/@tanstack/react-query.gen';
import { zCreateMeetingTypeRequest } from '../../api/generated/zod.gen';
import { apiErrorCode, errorText } from '../../lib/errors';

type Values = { title: string; description: string; durationMinutes: number | string };

const shape = zCreateMeetingTypeRequest.shape;

export function MeetingTypesTab() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const list = useQuery(meetingTypesListOptions());

  const form = useForm<Values>({
    initialValues: { title: '', description: '', durationMinutes: 30 },
    validate: (values) => ({
      title: shape.title.safeParse(values.title).success
        ? null
        : t('admin.meetingTypes.errors.title'),
      description: shape.description.safeParse(values.description).success
        ? null
        : t('admin.meetingTypes.errors.description'),
      durationMinutes: shape.durationMinutes.safeParse(values.durationMinutes).success
        ? null
        : t('admin.meetingTypes.errors.duration'),
    }),
  });

  const create = useMutation({
    ...meetingTypesCreateMutation(),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: meetingTypesListQueryKey() });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: errorText(i18n, apiErrorCode(error)),
      });
    },
  });

  const submit = form.onSubmit((values) => {
    create.mutate({
      body: {
        title: values.title,
        description: values.description,
        durationMinutes: Number(values.durationMinutes),
      },
    });
  });

  const listError = apiErrorCode(list.error);

  return (
    <Stack gap="xl" mt="lg">
      <Card padding="lg">
        <form onSubmit={submit} noValidate>
          <Stack>
            <Title order={2} size="h3">
              {t('admin.meetingTypes.formTitle')}
            </Title>
            <TextInput label={t('admin.meetingTypes.title')} {...form.getInputProps('title')} />
            <Textarea
              label={t('admin.meetingTypes.description')}
              {...form.getInputProps('description')}
            />
            <NumberInput
              label={t('admin.meetingTypes.duration')}
              allowDecimal={false}
              allowNegative={false}
              {...form.getInputProps('durationMinutes')}
            />
            <Group>
              <Button type="submit" loading={create.isPending}>
                {t('admin.meetingTypes.submit')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Stack>
        <Title order={2} size="h3">
          {t('admin.meetingTypes.listTitle')}
        </Title>
        {list.error ? (
          <Alert color="red" role="alert">
            {errorText(i18n, listError)}
          </Alert>
        ) : list.isPending ? (
          <Loader />
        ) : list.data.length === 0 ? (
          <Text c="dimmed">{t('admin.meetingTypes.empty')}</Text>
        ) : (
          list.data.map((type) => (
            <Card key={type.id} padding="md">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={500}>{type.title}</Text>
                  <Text size="sm" c="dimmed">
                    {type.description}
                  </Text>
                </Stack>
                <Badge variant="light">
                  {t('meetingType.duration', { count: type.durationMinutes })}
                </Badge>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
}
