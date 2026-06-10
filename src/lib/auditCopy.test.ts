import { describe, it, expect } from 'vitest';

import { describeAuditEvent, friendlyActor, formatAud, formatStars } from './auditCopy';

describe('formatAud', () => {
  it('renders cents as AUD dollars', () => {
    expect(formatAud(1000)).toBe('$10.00 AUD');
    expect(formatAud(99)).toBe('$0.99 AUD');
  });
  it('returns null for non-numbers', () => {
    expect(formatAud('1000')).toBeNull();
    expect(formatAud(undefined)).toBeNull();
  });
});

describe('formatStars', () => {
  it('pluralises correctly', () => {
    expect(formatStars(1)).toBe('1 Star');
    expect(formatStars(10)).toBe('10 Stars');
  });
  it('returns null when missing', () => {
    expect(formatStars(null)).toBeNull();
  });
});

describe('friendlyActor', () => {
  it('maps known actors to parent-facing labels', () => {
    expect(friendlyActor('parent')).toBe('You');
    expect(friendlyActor('kid')).toBe('Your child');
    expect(friendlyActor('agent')).toBe('AI helper');
    expect(friendlyActor('super_admin')).toBe('Airbotix');
  });
  it('humanizes unknown actors', () => {
    expect(friendlyActor('robot_overlord')).toBe('Robot overlord');
  });
});

describe('describeAuditEvent', () => {
  it('humanizes the wallet top-up from the bug report', () => {
    const copy = describeAuditEvent({
      event_type: 'wallet.topup_initiated',
      payload: {
        stars: 10,
        pack_sku: 'starter_10',
        amount_aud_cents: 1000,
        payment_intent_id: 'int_mock_7d7d2b59382a539c',
      },
    });
    expect(copy.icon).toBe('💳');
    expect(copy.title).toBe('Top-up started');
    expect(copy.detail).toBe('10 Stars · $10.00 AUD');
    // Internal fields (sku, payment_intent_id) must never surface in copy.
    expect(copy.detail).not.toContain('starter_10');
    expect(copy.detail).not.toContain('int_mock');
  });

  it('describes a successful top-up', () => {
    const copy = describeAuditEvent({
      event_type: 'wallet.topup_succeeded',
      payload: { stars: 10 },
    });
    expect(copy.title).toBe('Stars added to your wallet');
    expect(copy.detail).toBe('10 Stars');
  });

  it('collapses llm media events into a friendly sentence', () => {
    const text = describeAuditEvent({
      event_type: 'llm.text.completed',
      payload: { stars_charged: 1, model: 'claude', prompt_tokens: 50 },
    });
    expect(text.title).toBe('AI helped make text');
    expect(text.detail).toBe('1 Star');

    const image = describeAuditEvent({
      event_type: 'llm.image.completed',
      payload: { stars_charged: 3 },
    });
    expect(image.title).toBe('AI helped make an image');
    expect(image.icon).toBe('🖼️');

    const failed = describeAuditEvent({ event_type: 'llm.video.failed', payload: { error: 'x' } });
    expect(failed.title).toBe("AI couldn't make a video");
    expect(failed.detail).toBe('No Stars were charged');
  });

  it('rolls safety events up to a reassuring line', () => {
    const blocked = describeAuditEvent({
      event_type: 'safety.prompt.rejected',
      payload: { reason: 'unsafe_content', surface: 'learn' },
    });
    expect(blocked.title).toBe('Safety filter stepped in');
    expect(blocked.detail).toBe('Content was checked and adjusted.');
  });

  it('discriminates safety.prompt.rejected by stage', () => {
    const regex = describeAuditEvent({
      event_type: 'safety.prompt.rejected',
      payload: { stage: 'regex_blacklist' },
    });
    expect(regex.title).toBe('Filtered phrase detected');

    const topic = describeAuditEvent({
      event_type: 'safety.prompt.rejected',
      payload: { stage: 'topic_classifier', topic: 'violence' },
    });
    expect(topic.title).toBe('Topic not allowed');
    expect(topic.detail).toContain('Violence');

    const injection = describeAuditEvent({
      event_type: 'safety.prompt.rejected',
      payload: { stage: 'prompt_injection' },
    });
    expect(injection.title).toBe('Prompt injection blocked');
  });

  it('maps pii and pattern safety events to parent-friendly copy', () => {
    expect(describeAuditEvent({ event_type: 'safety.pii.blocked', payload: { categories: ['email'] } }).title)
      .toBe('Personal info protected');
    expect(describeAuditEvent({ event_type: 'safety.pii.warned', payload: {} }).title)
      .toBe('Personal info notice sent');
    expect(describeAuditEvent({ event_type: 'safety.pattern.escalated', payload: {} }).title)
      .toBe('Repeated safety triggers');
    expect(describeAuditEvent({ event_type: 'safety.prompt.aborted', payload: {} }).title)
      .toBe('Made a safer choice');
    expect(describeAuditEvent({ event_type: 'safety.response.rejected', payload: {} }).title)
      .toBe('AI response filtered');
    expect(describeAuditEvent({ event_type: 'safety.response.redacted', payload: {} }).title)
      .toBe('AI response adjusted');
  });

  it('never leaks raw machine strings for unmapped events', () => {
    const copy = describeAuditEvent({
      event_type: 'some_new.future_event.happened',
      payload: { whatever: true },
    });
    expect(copy.title).not.toContain('.');
    expect(copy.title).not.toContain('_');
    expect(copy.title).toBe('Future event happened');
  });
});
