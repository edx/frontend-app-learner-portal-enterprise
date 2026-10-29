import { Chip, Stack } from '@openedx/paragon';

export interface FollowUpChipsProps {
  question?: string | null;
  suggestions: string[];
  disabled: boolean;
  onSelect: (suggestion: string) => void;
}

/** A follow-up question with suggestion chips; clicking a chip sends it as the next message. */
const FollowUpChips = ({
  question, suggestions, disabled, onSelect,
}: FollowUpChipsProps) => (
  <div className="personalized-search__followups mt-2">
    {question && <p className="mb-2">{question}</p>}
    <Stack direction="horizontal" gap={2} className="flex-wrap">
      {suggestions.map((suggestion) => (
        <Chip
          key={suggestion}
          disabled={disabled}
          aria-disabled={disabled}
          onClick={() => {
            // Paragon's Chip styles `disabled` but still fires onClick, so guard here.
            if (!disabled) { onSelect(suggestion); }
          }}
        >
          {suggestion}
        </Chip>
      ))}
    </Stack>
  </div>
);

export default FollowUpChips;
