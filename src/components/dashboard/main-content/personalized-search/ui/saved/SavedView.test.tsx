import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import { createPortalItemLinks } from '../../adapters/portal/links';
import type { ItemCard } from '../../core/stream/types';
import SavedView from './SavedView';

const SAVED: ItemCard = {
  item_id: 'edX+X1',
  item_type: 'course',
  title: 'A saved course',
  image_url: null,
  partner_name: 'edX',
  partner_logo_url: null,
  link: { kind: 'course', course_key: 'edX+X1', course_type: 'verified-audit' },
  facts: { level_type: 'Introductory', weeks_to_complete: 4, pacing_type: 'self_paced' },
  why: 'Because it fits.',
  fit: [],
  status: 'new',
};

describe('SavedView', () => {
  it('shows no "Updated" badge: a saved snapshot isn\'t new to the page', () => {
    render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <SavedView items={[SAVED]} links={createPortalItemLinks('test-enterprise')} onToggleSave={jest.fn()} />
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(screen.getByRole('link', { name: 'A saved course' })).toBeInTheDocument();
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });
});
