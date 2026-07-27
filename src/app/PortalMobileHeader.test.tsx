// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { PortalMobileHeader } from './PortalMobileHeader';

afterEach(cleanup);

describe('PortalMobileHeader', () => {
  it.each([
    ['/portal', 'Dashboard'],
    ['/portal/classes', 'Find a class'],
    ['/portal/courses/story-blocks', 'Courses'],
    ['/portal/family/kid-1', 'Kid growth'],
    ['/portal/checkout/class/class-1', 'Checkout'],
  ])('shows the current parent destination for %s', (route, title) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <PortalMobileHeader />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('portal-mobile-header')).toHaveClass('xl:hidden');
    expect(screen.getByText(title)).toBeVisible();
  });
});
