/**
 * Pure selectors over chat state, shared by the controller and the UI (no React, no host).
 */
import type {
  AssistantTurn, CompareOption, ItemCard, PageBlock,
} from './stream/types';

/** Longest message the turn endpoint accepts. */
export const MAX_MESSAGE_LENGTH = 500;

/** Cards a section shows (one row on wide screens): its items, padded from its reserve. */
export const CARDS_PER_SECTION = 3;

export const isSendableMessage = (draft: string) => {
  const message = draft.trim();
  return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
};

/** Blocks that annotate results rather than make them: a turn with only these has no page of its own. */
const ANNOTATIONS = new Set(['caveat', 'profile']);

/** Whether a turn has results to show (any block other than a caveat or the profile). */
export const hasPage = (turn: AssistantTurn): boolean => turn.blocks.some(({ block }) => !ANNOTATIONS.has(block.type));

/** Latest turn before `index` that has a page. */
export const previousPageTurnId = (turns: AssistantTurn[], index: number): string | null => {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (hasPage(turns[i])) { return turns[i].localId; }
  }
  return null;
};

/** The newest turn that put item picks on the page, or null ("New picks", REQ-011). */
export const latestPicksTurnId = (turns: AssistantTurn[]): string | null => {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].blocks.some(({ block }) => block.type === 'item_section')) { return turns[i].localId; }
  }
  return null;
};

/**
 * The turn whose page is shown: the viewed turn if it has a page, else the latest turn with a
 * page. Off-topic, text-only, stopped and errored turns have no blocks, so the previous page stays.
 */
export const selectPageTurn = (turns: AssistantTurn[], viewedTurnId: string | null): AssistantTurn | null => {
  if (viewedTurnId) {
    const viewed = turns.find((turn) => turn.localId === viewedTurnId);
    if (viewed && hasPage(viewed)) { return viewed; }
  }
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (hasPage(turns[i])) { return turns[i]; }
  }
  return null;
};

/**
 * The turn whose results the page pane has on screen. Once a live turn is past understanding the message
 * (it's searching or writing, or has blocks), it replaces the previous results; until then, `selectPageTurn`.
 */
export const selectShownTurn = (turns: AssistantTurn[], viewedTurnId: string | null): AssistantTurn | null => {
  const latest = turns[turns.length - 1];
  const loading = !viewedTurnId && latest?.status === 'streaming'
    && (latest.blocks.length > 0 || latest.step === 'searching' || latest.step === 'writing');
  return loading ? latest : selectPageTurn(turns, viewedTurnId);
};

/**
 * The compare option that takes the top pick's place once the learner removes the top pick (Not for me, P1-4):
 * the first option that is neither the top pick nor removed. Null while the top pick stands, or when no other
 * option is left (the slot then closes).
 */
export const promotedTopPick = (
  blocks: PageBlock[],
  dismissedIds: ReadonlySet<string> | undefined,
): CompareOption | null => {
  const topPick = blocks.find(({ block }) => block.type === 'top_pick')?.block;
  if (topPick?.type !== 'top_pick' || !dismissedIds?.has(topPick.props.item.item_id)) { return null; }
  const compare = blocks.find(({ block }) => block.type === 'compare')?.block;
  if (compare?.type !== 'compare') { return null; }
  return compare.props.options.find(({ item }) => (
    item.item_id !== topPick.props.item.item_id && !dismissedIds.has(item.item_id)
  )) ?? null;
};

/**
 * How many distinct items the results show for a turn: the top pick (or the option that replaced it), the
 * compare options and each section's cards, padded from its reserve up to `CARDS_PER_SECTION`, without the
 * removed ones. An item shown twice (the top pick is usually compared too) counts once. Kept in step with the
 * blocks' rendering, so what the learner hears matches what they see.
 */
export const countShownItems = (turn: AssistantTurn | undefined, dismissedIds?: ReadonlySet<string>): number => {
  const blocks = turn?.blocks ?? [];
  const kept = (item: ItemCard) => !dismissedIds?.has(item.item_id);
  const shown = new Set<string>();
  const promoted = promotedTopPick(blocks, dismissedIds);
  if (promoted) { shown.add(promoted.item.item_id); }
  blocks.forEach(({ block }) => {
    let items: ItemCard[] = [];
    if (block.type === 'top_pick') {
      items = [block.props.item].filter(kept);
    } else if (block.type === 'compare') {
      items = block.props.options.map(({ item }) => item).filter(kept);
    } else if (block.type === 'item_section') {
      items = [...block.props.items, ...(block.props.reserve ?? [])].filter(kept).slice(0, CARDS_PER_SECTION);
    }
    items.forEach((item) => shown.add(item.item_id));
  });
  return shown.size;
};
