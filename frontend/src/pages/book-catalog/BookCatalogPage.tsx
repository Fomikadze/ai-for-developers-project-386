import {
  Alert,
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  getOwnerOptions,
  meetingTypesListOptions,
} from '../../api/generated/@tanstack/react-query.gen';
import { errorText } from '../../lib/errors';

export function BookCatalogPage() {
  const { t, i18n } = useTranslation();
  const owner = useQuery(getOwnerOptions());
  const types = useQuery(meetingTypesListOptions());

  const failure = owner.error ?? types.error;
  const code = (failure as { code?: unknown } | null)?.code;

  return (
    <Container size="md" py={56}>
      <Stack gap="xl">
        {owner.data && (
          <Group>
            <Avatar
              src={owner.data.avatarUrl}
              alt={owner.data.name}
              name={owner.data.name}
              size="lg"
            />
            <Stack gap={0}>
              <Title order={1} size="h2">
                {owner.data.name}
              </Title>
              <Text c="dimmed">{owner.data.title}</Text>
            </Stack>
          </Group>
        )}
        <Title order={2} size="h3">
          {t('catalog.title')}
        </Title>
        {failure ? (
          <Alert color="red" role="alert">
            {errorText(i18n, code)}
          </Alert>
        ) : !types.data ? (
          <Loader />
        ) : types.data.length === 0 ? (
          <Text c="dimmed">{t('catalog.empty')}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {types.data.map((type) => (
              <Card key={type.id} component={Link} to={`/book/${type.id}`} padding="lg">
                <Stack gap="xs" align="flex-start">
                  <Title order={3} size="h4">
                    {type.title}
                  </Title>
                  <Text c="dimmed" size="sm">
                    {type.description}
                  </Text>
                  <Badge variant="light">
                    {t('meetingType.duration', { count: type.durationMinutes })}
                  </Badge>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
