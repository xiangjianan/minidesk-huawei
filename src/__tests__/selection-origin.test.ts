import { describe, expect, it } from 'vitest';
import { guardSelectionOrigin } from '../utils/selectionOrigin';

describe('selection drag origin', () => {
  it('limits selection to the panel where a primary mouse drag begins and resets afterward', () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '<div class="quick"></div><section class="text-panel"><textarea></textarea></section><section class="todo-panel"><input class="todo-input"></section>';
    guardSelectionOrigin(doc);
    const down = (selector: string) => doc.querySelector(selector)!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    down('.quick');
    expect(doc.documentElement.classList.contains('selection-outside-notes')).toBe(true);
    expect(doc.documentElement.classList.contains('selection-outside-todos')).toBe(true);
    doc.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(doc.documentElement.className).toBe('');
    down('textarea');
    expect(doc.documentElement.classList.contains('selection-outside-notes')).toBe(false);
    expect(doc.documentElement.classList.contains('selection-outside-todos')).toBe(true);
    down('.todo-input');
    expect(doc.documentElement.classList.contains('selection-outside-notes')).toBe(true);
    expect(doc.documentElement.classList.contains('selection-outside-todos')).toBe(false);
  });
});
