import { Chip, Stack } from '@openedx/paragon';
import { AutoAwesome } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface FollowUpChipsProps {
  /** The fixed chips that narrow the results. */
  suggestions: string[];
  /** Chips the AI suggested for this conversation, shown after the fixed ones with a sparkle. */
  ideas?: string[];
  disabled: boolean;
  onSelect: (suggestion: string) => void;
  onSelectIdea: (idea: string) => void;
}

/**
 * Follow-up chips; clicking a chip sends it as the next message. The fixed chips narrow
 * the results; the AI's chips change with the conversation and carry a sparkle so learners can tell them apart.
 */
const FollowUpChips = ({
  suggestions, ideas = [], disabled, onSelect, onSelectIdea,
}: FollowUpChipsProps) => {
  const intl = useIntl();
  // Paragon's Chip styles `disabled` but still fires onClick, so guard here.
  const guarded = (send: (text: string) => void, text: string) => () => { if (!disabled) { send(text); } };
  return (
    <div className="personalized-search__followups mt-2">
      <Stack direction="horizontal" gap={2} className="flex-wrap">
        {suggestions.map((suggestion) => (
          <Chip key={suggestion} disabled={disabled} aria-disabled={disabled} onClick={guarded(onSelect, suggestion)}>
            {suggestion}
          </Chip>
        ))}
        {ideas.map((idea) => (
          <Chip
            key={`idea-${idea}`}
            className="personalized-search__idea-chip"
            iconBefore={AutoAwesome}
            disabled={disabled}
            aria-disabled={disabled}
            onClick={guarded(onSelectIdea, idea)}
          >
            {idea}
            {/* Paragon hides the sparkle from screen readers (its alt needs a clickable icon), so say it here. */}
            <span className="sr-only"> ({intl.formatMessage(messages.suggestedChip)})</span>
          </Chip>
        ))}
      </Stack>
    </div>
  );
};

export default FollowUpChips;
