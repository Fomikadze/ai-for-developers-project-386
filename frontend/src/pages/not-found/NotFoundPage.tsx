import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Container size="sm" py={56}>
      <Stack gap="lg" align="flex-start">
        <Title order={1}>{t('notFound.title')}</Title>
        <Text c="dimmed">{t('notFound.description')}</Text>
        <Button component={Link} to="/">
          {t('notFound.home')}
        </Button>
      </Stack>
    </Container>
  );
}
