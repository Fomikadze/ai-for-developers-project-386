import {
  Badge,
  Button,
  Card,
  Container,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function HomePage() {
  const { t } = useTranslation();
  const features = t('home.features.items', { returnObjects: true }) as string[];

  return (
    <Container size="lg" py={56}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={48}>
        <Stack gap="lg" align="flex-start">
          <Badge variant="white" color="gray" size="lg">
            {t('home.badge')}
          </Badge>
          <Title order={1} fz={48}>
            {t('app.name')}
          </Title>
          <Text size="lg" c="dimmed">
            {t('home.description')}
          </Text>
          <Button
            component={Link}
            to="/book"
            size="md"
            rightSection={<IconArrowRight size={18} aria-hidden />}
          >
            {t('nav.book')}
          </Button>
        </Stack>
        <Card padding="xl">
          <Title order={2} size="h3" mb="md">
            {t('home.features.title')}
          </Title>
          <List spacing="sm" c="dimmed">
            {features.map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List>
        </Card>
      </SimpleGrid>
    </Container>
  );
}
