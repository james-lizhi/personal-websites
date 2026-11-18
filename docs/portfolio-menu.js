export function createPortfolioMenu({ trigger, panel, projects, canOpen, onSelect }) {
  const workList = panel.querySelector('#portfolio-menu-projects');
  for (const project of projects) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = './project.html?id=' + encodeURIComponent(project.id);
    link.dataset.destination = project.id;
    link.textContent = project.id === 'packaging'
      ? '探究外卖包装对用户行为意向的影响'
      : project.name;
    item.append(link);
    workList.append(item);
  }

  const links = [...panel.querySelectorAll('a')];
  links.forEach((link, index) => link.style.setProperty('--menu-row', index));

  let available = false;
  let expanded = false;
  let clickedOpen = false;
  let closeTimer;
  const hovered = new Set();
  const contains = node => node instanceof Node && (trigger.contains(node) || panel.contains(node));

  function setExpanded(open) {
    clearTimeout(closeTimer);
    expanded = open;
    trigger.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
  }

  function close() {
    clickedOpen = false;
    hovered.delete(panel);
    setExpanded(false);
  }

  trigger.addEventListener('click', () => {
    if (!available || !canOpen()) return;
    if (clickedOpen) {
      close();
    } else {
      clickedOpen = true;
      setExpanded(true);
    }
  });

  for (const part of [trigger, panel]) {
    part.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || !available || !canOpen()) return;
      hovered.add(part);
      setExpanded(true);
    });
    part.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      hovered.delete(part);
      if (!expanded || contains(event.relatedTarget)) return;

      // Allow crossing the small gap between the brand and the panel.
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (panel.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return;
        close();
      }, 170);
    });
    part.addEventListener('focusout', event => {
      if (expanded && event.relatedTarget && !contains(event.relatedTarget)) close();
    });
  }

  document.addEventListener('pointerdown', event => {
    if (expanded && !contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (!expanded || event.defaultPrevented || event.key !== 'Escape') return;
    event.preventDefault();
    if (panel.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    close();
  });
  panel.addEventListener('click', event => {
    const link = event.target.closest('a[data-destination]');
    if (!link || event.defaultPrevented || event.button !== 0
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    if (!canOpen()) return;
    close();
    onSelect(link.dataset.destination);
  });

  return {
    close,
    hasPointer: () => available && hovered.size > 0,
    setAvailable(show) {
      available = show;
      trigger.classList.toggle('visible', show);
      trigger.inert = !show;
      if (!show) {
        hovered.clear();
        close();
      }
    },
  };
}
