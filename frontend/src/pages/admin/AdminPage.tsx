import { Container, Tabs, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { MeetingTypesTab } from './MeetingTypesTab';

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <Container size="md" py={56}>
      <Title order={1} mb="lg">
        {t('admin.title')}
      </Title>
      <Tabs defaultValue="meeting-types">
        <Tabs.List>
          <Tabs.Tab value="meeting-types">{t('admin.tabs.meetingTypes')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="meeting-types">
          <MeetingTypesTab />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
