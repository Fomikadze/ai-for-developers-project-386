import { Card, createTheme } from '@mantine/core';

const fontFamily = "'Roboto Variable', system-ui, sans-serif";

export const theme = createTheme({
  primaryColor: 'orange',
  defaultRadius: 'md',
  fontFamily,
  fontFamilyMonospace: "'Roboto Mono Variable', ui-monospace, monospace",
  headings: { fontFamily },
  components: {
    Card: Card.extend({ defaultProps: { withBorder: true, shadow: 'sm', radius: 'lg' } }),
  },
});
