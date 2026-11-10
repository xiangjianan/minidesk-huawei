/** Keep a mouse drag from selecting editor text in a panel it did not start in. */
export function guardSelectionOrigin(doc: Document): void {
  const root = doc.documentElement;
  const clear = () => {
    root.classList.remove('selection-outside-notes', 'selection-outside-todos');
  };
  doc.addEventListener('mousedown', (event) => {
    clear();
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    if (!event.target.closest('.text-panel')) root.classList.add('selection-outside-notes');
    if (!event.target.closest('.todo-panel')) root.classList.add('selection-outside-todos');
  }, true);
  doc.addEventListener('mouseup', clear, true);
  doc.defaultView?.addEventListener('blur', clear);
  doc.addEventListener('dragend', clear, true);
}
