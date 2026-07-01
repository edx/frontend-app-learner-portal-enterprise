import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import SkillsToDevelopCard from '../SkillsToDevelopCard';

const testSkills = ['SQL', 'Python', 'Data Visualization'];

const renderCard = (props: Partial<React.ComponentProps<typeof SkillsToDevelopCard>> = {}) => render(
  <IntlProvider locale="en">
    <SkillsToDevelopCard
      visibleSkills={testSkills}
      dismissedSkillCount={0}
      onDismissSkill={jest.fn()}
      onRestoreSkills={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('SkillsToDevelopCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all visible skill chips', () => {
    renderCard();
    testSkills.forEach((skill) => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
  });

  it('calls onDismissSkill with the skill name when the chip close icon is activated', async () => {
    const user = userEvent.setup();
    const onDismissSkill = jest.fn();
    renderCard({ onDismissSkill });
    await user.click(screen.getByLabelText('Dismiss SQL'));
    expect(onDismissSkill).toHaveBeenCalledWith('SQL');
  });

  it('does not show restore button when no skills are dismissed', () => {
    renderCard({ dismissedSkillCount: 0 });
    expect(screen.queryByRole('button', { name: 'Restore skills' })).not.toBeInTheDocument();
  });

  it('shows restore button when at least one skill is dismissed', () => {
    renderCard({ dismissedSkillCount: 2 });
    expect(screen.getByRole('button', { name: 'Restore skills' })).toBeInTheDocument();
  });

  it('calls onRestoreSkills when the restore button is clicked', async () => {
    const user = userEvent.setup();
    const onRestoreSkills = jest.fn();
    renderCard({ dismissedSkillCount: 1, onRestoreSkills });
    await user.click(screen.getByRole('button', { name: 'Restore skills' }));
    expect(onRestoreSkills).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when visibleSkills is empty', () => {
    renderCard({ visibleSkills: [] });
    expect(screen.getByTestId('skills-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('skills-list')).not.toBeInTheDocument();
  });
});
