import { Anchor, Container, Group, SegmentedControl } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { languages } from '../app/i18n';

export function Header() {
  const { t, i18n } = useTranslation();

  return (
    <Container component="header" size="lg" py="md">
      <Group justify="space-between">
        <Anchor component={Link} to="/" fw={700} size="xl" underline="never">
          {t('app.name')}
        </Anchor>
        <Group>
          <Anchor component={Link} to="/book">
            {t('nav.book')}
          </Anchor>
          <Anchor component={Link} to="/admin">
            {t('nav.admin')}
          </Anchor>
          <SegmentedControl
            size="xs"
            value={i18n.resolvedLanguage ?? 'ru'}
            onChange={(lng) => void i18n.changeLanguage(lng)}
            data={languages.map((lng) => ({ value: lng, label: lng.toUpperCase() }))}
          />
        </Group>
      </Group>
    </Container>
  );
}
