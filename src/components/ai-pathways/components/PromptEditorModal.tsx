import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Stack,
  Badge,
} from '@openedx/paragon';
import { XpertPromptBundle, PromptPart } from '../types';
import { InterceptContext } from '../hooks/usePromptInterceptor';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PromptEditorModalProps {
  /** The bundle currently being intercepted. `null` means the modal is hidden. */
  bundle: XpertPromptBundle | null;
  /** The context associated with this interception (label, messages, meta). */
  context: InterceptContext | null;
  /**
   * Called when the user clicks Accept.
   * Receives the (possibly edited) bundle — callers should pass this into
   * the interceptor's `accept()` convenience method.
   */
  onAccept: (editedBundle: XpertPromptBundle) => void;
  /** Called when the user clicks Reject (caller uses the original bundle). */
  onReject: () => void;
  /** Called when the user clicks Cancel (caller aborts the Xpert call). */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Sub-component: single editable prompt part
// ---------------------------------------------------------------------------

interface PromptPartEditorProps {
  part: PromptPart;
  onChange: (label: PromptPart['label'], value: string) => void;
}

const PromptPartEditor = ({ part, onChange }: PromptPartEditorProps) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem',
    }}
    >
      <strong style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{part.label}</strong>
      {part.required && <Badge variant="primary">required</Badge>}
      {!part.editable && <Badge variant="secondary">read-only</Badge>}
    </div>
    <textarea
      value={part.content}
      readOnly={!part.editable}
      onChange={(e) => onChange(part.label, e.target.value)}
      rows={Math.max(6, part.content.split('\n').length + 2)}
      style={{
        width: '100%',
        fontFamily: 'monospace',
        fontSize: '0.8125rem',
        padding: '0.5rem',
        boxSizing: 'border-box',
        resize: 'vertical',
        backgroundColor: part.editable ? '#ffffff' : '#f8f9fa',
        border: '1px solid #ced4da',
        borderRadius: '0.25rem',
      }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Main modal component
// ---------------------------------------------------------------------------

/**
 * `PromptEditorModal` renders a functional (no-CSS-framework-complexity) editor
 * for an `XpertPromptBundle` before it is dispatched to Xpert.
 *
 * It is intentionally unstyled beyond inline layout — visual polish is deferred
 * to the integration step (Prompt 6).  The component is self-contained and does
 * NOT register itself with the interceptor hook; the parent is responsible for
 * wiring `onAccept` / `onReject` / `onCancel` to `usePromptInterceptor`.
 */
export const PromptEditorModal = ({
  bundle,
  context,
  onAccept,
  onReject,
  onCancel,
}: PromptEditorModalProps) => {
  // Local copy of parts so edits don't mutate the original bundle.
  const [editedParts, setEditedParts] = useState<PromptPart[]>([]);

  // Sync local state whenever a new bundle is passed in.
  useEffect(() => {
    if (bundle) {
      setEditedParts(bundle.parts.map(p => ({ ...p })));
    }
  }, [bundle]);

  // Not visible when there is no active interception.
  if (!bundle || !context) {
    return null;
  }

  const handlePartChange = (label: PromptPart['label'], value: string) => {
    setEditedParts(prev => prev.map(p => (p.label === label ? { ...p, content: value } : p)));
  };

  const handleAccept = () => {
    const combined = editedParts.map(p => p.content).join('');
    const editedBundle: XpertPromptBundle = {
      ...bundle,
      parts: editedParts,
      combined,
    };
    onAccept(editedBundle);
  };

  return (
    /* Overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Prompt Editor — ${context.label}`}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '2rem 1rem',
        overflowY: 'auto',
      }}
    >
      {/* Dialog panel */}
      <Card
        style={{
          width: '100%',
          maxWidth: '860px',
          margin: '0 auto',
        }}
      >
        <Card.Header
          title={`Prompt Editor — ${context.label}`}
          subtitle={
            context.meta?.stage
              ? `Stage: ${String(context.meta.stage)}`
              : undefined
          }
        />

        <Card.Section>
          {/* Context summary */}
          <div style={{ marginBottom: '1.25rem' }}>
            <strong>Outbound messages ({context.messages.length})</strong>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem',
                padding: '0.5rem',
                marginTop: '0.25rem',
                maxHeight: '6rem',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {context.messages.map((m, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i}>
                  <Badge variant="secondary" style={{ marginRight: '0.25rem' }}>{m.role}</Badge>
                  {m.content.length > 200 ? `${m.content.slice(0, 200)}…` : m.content}
                </div>
              ))}
            </div>
          </div>

          {/* Editable prompt parts */}
          <div>
            <strong style={{ display: 'block', marginBottom: '0.75rem' }}>
              Prompt parts ({editedParts.length})
            </strong>
            {editedParts.map(part => (
              <PromptPartEditor
                key={part.label}
                part={part}
                onChange={handlePartChange}
              />
            ))}
          </div>
        </Card.Section>

        <Card.Footer>
          <Stack direction="horizontal" gap={2}>
            <Button variant="primary" onClick={handleAccept}>
              Accept
            </Button>
            <Button variant="outline-secondary" onClick={onReject}>
              Reject (use original)
            </Button>
            <Button variant="outline-danger" onClick={onCancel}>
              Cancel
            </Button>
          </Stack>
        </Card.Footer>
      </Card>
    </div>
  );
};
