import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import SearchNoResults from '../SearchNoResults';
import SearchError from '../SearchError';
import PopularResults from '../popular-results/PopularResults';
import messages from '../messages';
import { getNoResultsMessage, getPopularResultsHeading, getSearchErrorMessage } from '../../utils/search';
import {
  ACADEMY_TITLE,
  COURSE_TITLE,
  EXECUTIVE_EDUCATION_TITLE,
  HIGHLIGHTS_TITLE,
  PATHWAY_TITLE,
  PROGRAM_TITLE,
  VIDEO_TITLE,
} from '../constants';

// The index wrapper needs an InstantSearch context; the heading itself is asserted against the
// inner component below, which is imported by its own path and so is left unmocked.
jest.mock('../popular-results', () => ({
  PopularResults: () => <div data-testid="popular-results" />,
}));

jest.mock('react-instantsearch-dom', () => ({
  ...jest.requireActual('react-instantsearch-dom'),
  connectStateResults: (Component) => Component,
}));

jest.mock('@2uinc/frontend-enterprise-catalog-search', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-catalog-search'),
  useNbHitsFromSearchResults: jest.fn(() => 1),
}));

const renderWithMessages = (ui, intlMessages) => render(
  <IntlProvider locale={intlMessages ? 'es' : 'en'} messages={intlMessages}>{ui}</IntlProvider>,
);

describe('search messages', () => {
  describe('English copy is unchanged', () => {
    it.each([
      [COURSE_TITLE, 'No courses were found to match your search results.', 'Check out some popular courses below.'],
      [EXECUTIVE_EDUCATION_TITLE, 'No executive education courses were found to match your search results.', 'Check out some popular executive education courses below.'],
      [PROGRAM_TITLE, 'No programs were found to match your search results.', 'Check out some popular programs below.'],
      [PATHWAY_TITLE, 'No pathways were found to match your search results.', 'Check out some popular pathways below.'],
      [VIDEO_TITLE, 'No videos were found to match your search results.', 'Check out some popular videos below.'],
      [HIGHLIGHTS_TITLE, 'No highlights were found to match your search results.', 'Check out some popular highlights below.'],
    ])('renders the no-results alert for %s', (title, expectedTitle, expectedContent) => {
      renderWithMessages(<SearchNoResults title={title} />);
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      expect(screen.getByText(expectedContent)).toBeInTheDocument();
    });

    it.each([
      [COURSE_TITLE, 'An error occurred while finding courses that match your search.'],
      [EXECUTIVE_EDUCATION_TITLE, 'An error occurred while finding executive education courses that match your search.'],
      [ACADEMY_TITLE, 'An error occurred while finding academies that match your search.'],
    ])('renders the error alert for %s', (title, expectedTitle) => {
      renderWithMessages(<SearchError title={title} />);
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      expect(screen.getByText('Please try again later.')).toBeInTheDocument();
    });

    it.each([
      [PROGRAM_TITLE, 'Popular Programs'],
      [HIGHLIGHTS_TITLE, 'Popular highlights'],
    ])('renders the popular results heading for %s', (title, expectedHeading) => {
      renderWithMessages(<PopularResults title={title} searchResults={{ hits: [] }} />);
      expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument();
    });
  });

  describe('translated copy', () => {
    it('renders the no-results alert in Spanish', () => {
      renderWithMessages(<SearchNoResults title={PROGRAM_TITLE} />, {
        [messages.noResultsTitlePrograms.id]: 'No se encontraron programas que coincidan con tu búsqueda.',
        [messages.noResultsContentPrograms.id]: 'Echa un vistazo a algunos programas populares a continuación.',
      });
      expect(screen.getByText('No se encontraron programas que coincidan con tu búsqueda.')).toBeInTheDocument();
      expect(screen.getByText('Echa un vistazo a algunos programas populares a continuación.')).toBeInTheDocument();
      expect(screen.queryByText(/were found to match/)).not.toBeInTheDocument();
    });

    it('renders the error alert in Spanish', () => {
      renderWithMessages(<SearchError title={PROGRAM_TITLE} />, {
        [messages.errorTitlePrograms.id]: 'Ocurrió un error al buscar programas.',
        [messages.errorTryAgainLater.id]: 'Inténtalo de nuevo más tarde.',
      });
      expect(screen.getByText('Ocurrió un error al buscar programas.')).toBeInTheDocument();
      expect(screen.getByText('Inténtalo de nuevo más tarde.')).toBeInTheDocument();
    });

    it('renders the popular results heading in Spanish', () => {
      renderWithMessages(<PopularResults title={PROGRAM_TITLE} searchResults={{ hits: [] }} />, {
        [messages.popularHeadingPrograms.id]: 'Programas populares',
      });
      expect(screen.getByRole('heading', { name: 'Programas populares' })).toBeInTheDocument();
      expect(screen.queryByText('Popular Programs')).not.toBeInTheDocument();
    });
  });

  describe('fallback messages', () => {
    it('falls back to the generic no-results copy for academies, which have no dedicated empty state', () => {
      renderWithMessages(<SearchNoResults title={ACADEMY_TITLE} />);
      expect(getNoResultsMessage(ACADEMY_TITLE).messageTitle.id).toEqual(messages.noResultsTitleDefault.id);
      expect(screen.getByText('No academies were found to match your search results.')).toBeInTheDocument();
      expect(screen.getByText('Check out some popular academies below.')).toBeInTheDocument();
    });

    it('falls back to the generic copy for a title with no dedicated messages', () => {
      renderWithMessages(<SearchNoResults title="Widgets" />);
      expect(screen.getByText('No widgets were found to match your search results.')).toBeInTheDocument();
      expect(screen.getByText('Check out some popular widgets below.')).toBeInTheDocument();
    });

    // The generic fallback renders the same English as the dedicated messages, so these assert the
    // descriptor identity: a title dropped from SEARCH_MESSAGES_BY_TITLE would silently go back to
    // interpolating an untranslated English noun, which is the bug this change removes.
    it.each([
      [COURSE_TITLE, 'Courses'],
      [EXECUTIVE_EDUCATION_TITLE, 'ExecutiveEducation'],
      [PROGRAM_TITLE, 'Programs'],
      [PATHWAY_TITLE, 'Pathways'],
      [VIDEO_TITLE, 'Videos'],
      [HIGHLIGHTS_TITLE, 'Highlights'],
    ])('uses the dedicated no-results and error descriptors for %s', (title, suffix) => {
      expect(getNoResultsMessage(title).messageTitle.id).toEqual(messages[`noResultsTitle${suffix}`].id);
      expect(getNoResultsMessage(title).messageContent.id).toEqual(messages[`noResultsContent${suffix}`].id);
      expect(getSearchErrorMessage(title).messageTitle.id).toEqual(messages[`errorTitle${suffix}`].id);
    });

    it.each([
      [COURSE_TITLE, 'Courses'],
      [EXECUTIVE_EDUCATION_TITLE, 'ExecutiveEducation'],
      [PROGRAM_TITLE, 'Programs'],
      [PATHWAY_TITLE, 'Pathways'],
      [VIDEO_TITLE, 'Videos'],
    ])('uses the dedicated popular heading for %s', (title, suffix) => {
      expect(getPopularResultsHeading(title).messageTitle.id).toEqual(messages[`popularHeading${suffix}`].id);
    });

    // Highlights never render popular hits (getHitComponentFromTitle returns null for them), so
    // they intentionally have no dedicated heading and fall back to the generic descriptor.
    it('falls back to the generic popular heading for highlights', () => {
      expect(getPopularResultsHeading(HIGHLIGHTS_TITLE).messageTitle.id)
        .toEqual(messages.popularHeadingDefault.id);
    });

    it('uses the dedicated error descriptor for academies and the shared retry line', () => {
      expect(getSearchErrorMessage(ACADEMY_TITLE).messageTitle.id).toEqual(messages.errorTitleAcademies.id);
      expect(getSearchErrorMessage(VIDEO_TITLE).messageContent.id).toEqual(messages.errorTryAgainLater.id);
      expect(getPopularResultsHeading('Widgets').values).toEqual({ contentType: 'Widgets' });
    });
  });
});
