// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LoginPage as KidLoginPage } from './learn/LoginPage';
import { LoginPage as ParentLoginPage } from './portal/LoginPage';

function renderLogin(path: '/portal/login' | '/learn/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/portal/login" element={<ParentLoginPage />} />
        <Route path="/learn/login" element={<KidLoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function LocationStateProbe() {
  const location = useLocation();
  return <output data-testid="location-state">{JSON.stringify(location.state)}</output>;
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
    // The parent is offered an explicit choice of sign-in method (§4.8): both a
    // Password tab and an Email code tab, side by side.
    expect(screen.getByRole('tab', { name: 'Password' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Email code' })).toBeVisible();
    // Password is the default tab — its form (and the "Log in" button) shows first.
    expect(screen.getByLabelText('Password')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  it('lets the parent choose between the password and email-code sign-in methods', () => {
    renderLogin('/portal/login');

    // Default tab is Password — its form shows.
    expect(screen.getByLabelText('Password')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeVisible();

    // Choosing the Email code tab swaps to the passwordless code form.
    fireEvent.click(screen.getByRole('tab', { name: 'Email code' }));
    expect(screen.getByRole('button', { name: 'Send code & continue' })).toBeVisible();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    // And back to the Password tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }));
    expect(screen.getByLabelText('Password')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  it('keeps the protected destination when the active parent role is re-selected', () => {
    const from = {
      pathname: '/portal/checkout/class/class_1',
      search: '?source=classes',
      hash: '',
      state: null,
      key: 'checkout',
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/portal/login', state: { from } }]}>
        <Routes>
          <Route
            path="/portal/login"
            element={
              <>
                <ParentLoginPage />
                <LocationStateProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('auth-role-parent'));

    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '/portal/checkout/class/class_1',
    );
    expect(screen.getByTestId('location-state')).toHaveTextContent('source=classes');
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
