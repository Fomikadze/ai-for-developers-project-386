import { Button, Card, Container, List, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function HomePage() {
  const { t } = useTranslation();
  const features = t('home.features.items', { returnObjects: true }) as string[];

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>{t('home.title')}</Title>
        <Text>{t('home.description')}</Text>
        <Button component={Link} to="/book" w="fit-content">
          {t('nav.book')}
        </Button>
        <Card withBorder>
          <Title order={3} mb="sm">
            {t('home.features.title')}
          </Title>
          <List>
            {features.map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List>
        </Card>
      </Stack>
    </Container>
  );
}
