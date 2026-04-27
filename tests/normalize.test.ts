import { describe, expect, it } from 'vitest';
import { errorToToolResult, normalizeToolResult } from '../src/core/normalize.js';

describe('normalizeToolResult', () => {
  it('wraps a string into a single text content', () => {
    expect(normalizeToolResult('hi')).toEqual({
      content: [{ type: 'text', text: 'hi' }],
    });
  });

  it('passes through a content array', () => {
    expect(
      normalizeToolResult([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ]),
    ).toEqual({
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    });
  });

  it('wraps a single content object', () => {
    expect(normalizeToolResult({ type: 'text', text: 'x' })).toEqual({
      content: [{ type: 'text', text: 'x' }],
    });
  });

  it('preserves an explicit envelope', () => {
    expect(
      normalizeToolResult({
        content: [{ type: 'text', text: 'oops' }],
        isError: true,
      }),
    ).toEqual({
      content: [{ type: 'text', text: 'oops' }],
      isError: true,
    });
  });
});

describe('errorToToolResult', () => {
  it('renders Error.message', () => {
    expect(errorToToolResult(new Error('nope'))).toEqual({
      content: [{ type: 'text', text: 'nope' }],
      isError: true,
    });
  });

  it('coerces non-Error values', () => {
    expect(errorToToolResult(42)).toEqual({
      content: [{ type: 'text', text: '42' }],
      isError: true,
    });
  });
});
