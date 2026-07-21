// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LoginPage as KidLoginPage } from './learn/LoginPage';
import { LoginPage as ParentLoginPage } from './portal/LoginPage';

interface LoginLocationState {
  from?: Pick<Location, 'pathname'>;
}

function LoginLocationProbe() {
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;

  return <output data-testid="login-return-to">{from?.pathname ?? 'none'}</output>;
}

function renderLogin(
  entry:
    | '/portal/login'
    | '/learn/login'
    | { pathname: '/portal/login' | '/learn/login'; state?: LoginLocationState },
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/portal/login"
          element={
            <>
              <ParentLoginPage />
              <LoginLocationProbe />
            </>
          }
        />
        <Route path="/learn/login" element={<KidLoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('shared login identity gateway', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);

  it('makes the parent identity and registration path explicit on first view', () => {
    renderLogin('/portal/login');

    expect(screen.getByRole('navigation', { name: 'Choose who is signing in' })).toBeVisible();
    expect(screen.getByLabelText('Airbotix creative platform world')).toBeVisible();
    expect(screen.getByTestId('auth-role-parent')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('auth-role-kid')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: /Parent login or sign up/ })).toBeVisible();
    expect(screen.getByText('New to Airbotix?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send code & continue' })).toBeVisible();
  });

  it('switches to the clearly labelled kid sign-in without a page reload', () => {
    renderLogin('/portal/login');

    fireEvent.click(screen.getByTestId('auth-role-kid'));

    expect(screen.getByTestId('auth-role-kid')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('auth-role-parent')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Kids sign in here')).toBeVisible();
    expect(screen.getByPlaceholderText('WANG')).toBeVisible();
    expect(screen.getByPlaceholderText('••••')).toBeVisible();
  });

  it('keeps the checkout return target when the active parent identity is clicked', () => {
    const checkoutPath = '/portal/checkout/class/class-1';
    renderLogin({
      pathname: '/portal/login',
      state: { from: { pathname: checkoutPath } },
    });

    expect(screen.getByTestId('login-return-to')).toHaveTextContent(checkoutPath);

    fireEvent.click(screen.getByTestId('auth-role-parent'));

    expect(screen.getByTestId('login-return-to')).toHaveTextContent(checkoutPath);
  });

  it('lets families browse and pause the featured creations', () => {
    renderLogin('/portal/login');

    const rhythmCreation = screen.getByTestId('auth-promo-rhythm');
    expect(rhythmCreation).not.toHaveClass('auth-game-promo-active');

    fireEvent.click(screen.getByRole('button', { name: 'Show Turn music into play' }));

    expect(rhythmCreation).toHaveClass('auth-game-promo-active');
    expect(screen.getByText('Turn music into play')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Pause featured creations' }));
    expect(screen.getByRole('button', { name: 'Play featured creations' })).toBeVisible();
  });
});
