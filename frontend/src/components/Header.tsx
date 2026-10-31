import { Anchor, Box, Container, Group, SegmentedControl, ThemeIcon } from '@mantine/core';
import { IconCalendarTime } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { languages } from '../app/i18n';
import classes from './Header.module.css';

export function Header() {
  const { t, i18n } = useTranslation();

  return (
    <Box component="header" className={classes.root}>
      <Container size="lg" py="md">
        <Group justify="space-between">
          <Anchor component={Link} to="/" c="dark" fw={700} size="lg" underline="never">
            <Group gap="xs">
              <ThemeIcon variant="transparent" aria-hidden>
                <IconCalendarTime />
              </ThemeIcon>
              {t('app.name')}
            </Group>
          </Anchor>
          <Group>
            <Anchor component={NavLink} to="/book" className={classes.link} underline="never">
              {t('nav.book')}
            </Anchor>
            <Anchor component={NavLink} to="/admin" className={classes.link} underline="never">
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
    </Box>
  );
}
