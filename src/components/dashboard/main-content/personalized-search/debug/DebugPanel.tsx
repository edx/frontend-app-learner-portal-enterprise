import {
  Alert, Badge, Button, Card, Form, Stack,
} from '@openedx/paragon';

import type { DebugConfig, DebugModel } from '../services/debugConfig';
import type { DebugSettings } from '../state/personalizedSearchStore';
import type { AssistantTurn } from '../stream/types';
import {
  median, NUMERIC_COLUMNS, toBenchmarkRows,
} from './benchmark';
import type { BenchmarkRow, NumericColumn } from './benchmark';

export interface DebugPanelProps {
  baseUrl: string | null;
  settings: DebugSettings;
  config: DebugConfig | null | undefined;
  configError: string | null;
  turns: AssistantTurn[];
  onChange: (changes: Partial<DebugSettings>) => void;
  onCopyResults: (rows: BenchmarkRow[]) => void;
}

const SERVER_DEFAULT = '';

/** `gpt-5.4-mini · $0.75/$4.5 per 1M`, or just the label for a backend with no token pricing (Xpert). */
export const modelOptionLabel = (model: DebugModel) => (
  model.price_in === null || model.price_out === null
    ? `${model.label ?? model.id} · no token pricing`
    : `${model.label ?? model.id} · $${model.price_in}/$${model.price_out} per 1M`
);

const formatMs = (value: number | null) => (value === null ? '–' : `${(value / 1000).toFixed(2)} s`);
const formatCost = (value: number | null) => (value === null ? '–' : `$${value.toFixed(4)}`);
const formatCell = (column: NumericColumn, value: number | null) => {
  if (column === 'costUsd') { return formatCost(value); }
  if (column === 'composeOutputTokens') { return value === null ? '–' : String(value); }
  return formatMs(value);
};

const COLUMN_LABELS: Record<NumericColumn, string> = {
  intentMs: 'Intent',
  retrievalMs: 'Search',
  firstTextMs: 'First text',
  firstSectionMs: 'First tiles',
  completeMs: 'Page done',
  composeOutputTokens: 'Out tokens',
  costUsd: 'Cost',
};

interface ModelPickerProps {
  label: string;
  idPrefix: string;
  config: DebugConfig;
  model: string | null;
  effort: string | null;
  defaultModel: string;
  defaultEffort: string | null;
  onChange: (model: string | null, effort: string | null) => void;
}

const ModelPicker = ({
  label, idPrefix, config, model, effort, defaultModel, defaultEffort, onChange,
}: ModelPickerProps) => {
  const efforts = config.models.find((m) => m.id === (model ?? defaultModel))?.efforts ?? [null];
  return (
    <Stack direction="horizontal" gap={2} className="flex-wrap">
      <Form.Group controlId={`${idPrefix}-model`} className="mb-0">
        <Form.Label className="small mb-1">{label} model</Form.Label>
        <Form.Control
          as="select"
          size="sm"
          value={model ?? SERVER_DEFAULT}
          onChange={(e) => onChange(e.target.value || null, null)}
        >
          <option value={SERVER_DEFAULT}>{`Server default (${defaultModel})`}</option>
          {config.models.map((m) => (
            <option key={m.id} value={m.id}>{modelOptionLabel(m)}</option>
          ))}
        </Form.Control>
      </Form.Group>
      <Form.Group controlId={`${idPrefix}-effort`} className="mb-0">
        <Form.Label className="small mb-1">Reasoning</Form.Label>
        <Form.Control
          as="select"
          size="sm"
          value={effort ?? SERVER_DEFAULT}
          disabled={!model || efforts.every((e) => e === null)}
          onChange={(e) => onChange(model, e.target.value || null)}
        >
          <option value={SERVER_DEFAULT}>{model ? 'Lowest' : `Default (${defaultEffort ?? 'lowest'})`}</option>
          {efforts.filter((e): e is string => e !== null).map((e) => <option key={e} value={e}>{e}</option>)}
        </Form.Control>
      </Form.Group>
    </Stack>
  );
};

/**
 * Developer panel shown with `?debug=true`: switch live AI on or off, pick the intent and compose
 * models, and compare turns in a benchmark table. Overrides only apply when enterprise-access has
 * `PERSONALIZED_SEARCH_DEBUG_OVERRIDES_ENABLED` on (otherwise the menu doesn't load).
 */
const DebugPanel = ({
  baseUrl, settings, config, configError, turns, onChange, onCopyResults,
}: DebugPanelProps) => {
  const rows = toBenchmarkRows(turns);
  const done = rows.filter((row) => row.status === 'done');
  return (
    <Card className="personalized-search__debug mb-3" data-testid="personalized-search-debug">
      <Card.Section>
        <Stack gap={3}>
          <Stack direction="horizontal" gap={3} className="flex-wrap">
            <Badge variant="warning">Debug</Badge>
            <Form.Switch
              checked={settings.live}
              onChange={(e) => onChange({ live: e.target.checked })}
              helperText={settings.live ? `Live AI · ${baseUrl ?? ''}` : 'Canned fixture replies, no model calls'}
            >
              Live AI
            </Form.Switch>
            {config && <span className="small text-muted">{`Catalog: ${config.catalog}`}</span>}
          </Stack>
          {settings.live && config && (
            <Stack direction="horizontal" gap={4} className="flex-wrap align-items-end">
              <ModelPicker
                label="Compose"
                idPrefix="ps-debug-compose"
                config={config}
                model={settings.composeModel}
                effort={settings.composeEffort}
                defaultModel={config.defaults.compose_model}
                defaultEffort={config.defaults.compose_effort}
                onChange={(composeModel, composeEffort) => onChange({ composeModel, composeEffort })}
              />
              <ModelPicker
                label="Intent"
                idPrefix="ps-debug-intent"
                config={config}
                model={settings.intentModel}
                effort={settings.intentEffort}
                defaultModel={config.defaults.intent_model}
                defaultEffort={config.defaults.intent_effort}
                onChange={(intentModel, intentEffort) => onChange({ intentModel, intentEffort })}
              />
            </Stack>
          )}
          {settings.live && config === null && (
            <Alert variant="info" className="mb-0">
              {configError ?? 'The model switcher is off: this enterprise-access has debug overrides disabled, so turns use its default models.'}
            </Alert>
          )}
          {rows.length > 0 && (
            <div className="personalized-search__debug-table">
              <table className="table table-sm small mb-2">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Message</th>
                    <th scope="col">Models (intent / compose)</th>
                    {NUMERIC_COLUMNS.map((column) => <th key={column} scope="col">{COLUMN_LABELS[column]}</th>)}
                    <th scope="col">Dropped</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.turn}>
                      <td>{row.turn}</td>
                      <td title={row.message}>{row.message.length > 40 ? `${row.message.slice(0, 40)}…` : row.message}</td>
                      <td>
                        {row.status === 'done'
                          ? `${row.intentModel ?? '–'} / ${row.composeModel ?? '–'}${row.composeEffort ? ` (${row.composeEffort})` : ''}`
                          : <Badge variant="danger">{row.status}</Badge>}
                      </td>
                      {NUMERIC_COLUMNS.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}
                      <td>{row.droppedLines ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
                {done.length > 1 && (
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={3}>{`Median of ${done.length} finished turns`}</th>
                      {NUMERIC_COLUMNS.map((column) => (
                        <td key={column}>{formatCell(column, median(done, column))}</td>
                      ))}
                      <td>–</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <Button variant="outline-primary" size="sm" onClick={() => onCopyResults(rows)}>
                Copy results as JSON
              </Button>
            </div>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};

export default DebugPanel;
