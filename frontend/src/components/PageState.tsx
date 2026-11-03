import { Button, Container, Loader, Stack, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Состояние «тип встречи не найден» с возвратом к каталогу. */
export function MeetingTypeNotFound() {
  const { t } = useTranslation();
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

/** Состояние загрузки страницы записи. */
export function PageLoader() {
  return (
    <Container size="md" py={56}>
      <Loader />
    </Container>
  );
}
