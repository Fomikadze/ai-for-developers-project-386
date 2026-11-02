import { render, screen } from '@testing-library/react';
import { AppProviders } from '../app/App';
import i18n from '../app/i18n';
import { SlotList } from './SlotList';

it('показывает «Нет свободного времени» для дня без слотов', async () => {
  await i18n.changeLanguage('ru');
  render(
    <AppProviders>
      <SlotList times={[]} selected={null} onSelect={() => {}} />
    </AppProviders>,
  );

  expect(screen.getByText('Нет свободного времени')).toBeInTheDocument();
});
