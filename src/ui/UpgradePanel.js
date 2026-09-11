import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from '../progression/upgradeDefinitions.js';

const TREE_WIDTH = 900;
const TREE_HEIGHT = 1500;

const STATUS_PRESENTATION = Object.freeze({
  purchased: Object.freeze({ className: 'purchased', label: 'Purchased' }),
  available: Object.freeze({ className: 'available', label: 'Available' }),
  INSUFFICIENT_XP: Object.freeze({ className: 'insufficient-xp', label: 'Not enough XP' }),
  PREREQUISITES: Object.freeze({ className: 'locked', label: 'Locked' }),
  LIFETIME_XP_GATE: Object.freeze({ className: 'locked', label: 'Locked' }),
});

/**
 * Presentation-only coordinates for the passive-style skill tree.
 * Progression requirements remain authoritative in upgradeDefinitions/ProgressionManager.
 */
export const SKILL_TREE_LAYOUT = Object.freeze({
  betterTraining1: Object.freeze({ x: 450, y: 70, sigil: 'XP' }),
  betterTraining2: Object.freeze({ x: 450, y: 190, sigil: 'II' }),
  betterTraining3: Object.freeze({ x: 450, y: 310, sigil: 'III' }),

  quickReload1: Object.freeze({ x: 260, y: 190, sigil: 'RL' }),
  quickReload2: Object.freeze({ x: 220, y: 310, sigil: 'II' }),
  quickReload3: Object.freeze({ x: 180, y: 430, sigil: 'III' }),
  recoveryMastery: Object.freeze({ x: 140, y: 550, sigil: 'RM' }),

  steadyHands1: Object.freeze({ x: 650, y: 190, sigil: 'PR' }),
  steadyHands2: Object.freeze({ x: 690, y: 310, sigil: 'II' }),
  perfectWindow1: Object.freeze({ x: 730, y: 430, sigil: 'PW' }),
  perfectWindow2: Object.freeze({ x: 770, y: 550, sigil: 'II' }),

  criticalTraining1: Object.freeze({ x: 560, y: 310, sigil: 'CR' }),
  criticalTraining2: Object.freeze({ x: 500, y: 800, sigil: 'II' }),
  criticalMastery: Object.freeze({ x: 520, y: 930, sigil: 'CM' }),

  twinThrow: Object.freeze({ x: 340, y: 440, sigil: '×2' }),
  secondDummy: Object.freeze({ x: 340, y: 560, sigil: 'T2' }),
  tripleThrow: Object.freeze({ x: 340, y: 680, sigil: '×3' }),
  thirdDummy: Object.freeze({ x: 340, y: 800, sigil: 'T3' }),
  comboTraining: Object.freeze({ x: 390, y: 930, sigil: 'CO' }),
  quadThrow: Object.freeze({ x: 340, y: 1050, sigil: '×4' }),
  fourthDummy: Object.freeze({ x: 340, y: 1170, sigil: 'T4' }),
  comboMastery: Object.freeze({ x: 470, y: 1170, sigil: 'CM' }),
  boomerangMastery: Object.freeze({ x: 400, y: 1300, sigil: 'BM' }),

  dogCompanion: Object.freeze({ x: 600, y: 560, sigil: 'DOG' }),
  dogTraining1: Object.freeze({ x: 570, y: 700, sigil: 'DT' }),
  dogTraining2: Object.freeze({ x: 540, y: 820, sigil: 'II' }),
  fastFetch1: Object.freeze({ x: 720, y: 700, sigil: 'FF' }),
  fastFetch2: Object.freeze({ x: 750, y: 820, sigil: 'II' }),
  fetchMastery: Object.freeze({ x: 650, y: 950, sigil: 'FM' }),
  dogTraining3: Object.freeze({ x: 585, y: 1080, sigil: 'III' }),
  fastFetch3: Object.freeze({ x: 715, y: 1080, sigil: 'III' }),

  grandmaster: Object.freeze({ x: 500, y: 1410, sigil: 'GM' }),
});

export function getSkillNodePresentation({ purchased, status }) {
  if (purchased) return STATUS_PRESENTATION.purchased;
  if (status.ok) return STATUS_PRESENTATION.available;
  return STATUS_PRESENTATION[status.reason] ?? STATUS_PRESENTATION.PREREQUISITES;
}

/**
 * DOM skill-tree renderer inspired by large passive trees: connected nodes plus one detail card.
 * Purchase rules and effects remain entirely inside ProgressionManager.
 */
export class UpgradePanel {
  constructor({ mountElement, progressionManager, onPurchase, onClose }) {
    this.mountElement = mountElement;
    this.progressionManager = progressionManager;
    this.onPurchase = onPurchase;
    this.onClose = onClose;
    this.isOpen = false;
    this.selectedUpgradeId = null;
  }

  /** Open and render current progression state. */
  open() {
    this.isOpen = true;
    this.mountElement.hidden = false;
    this.render();
  }

  /** Hide without mutating gameplay/progression. */
  close() {
    this.isOpen = false;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  /** Render the complete skill graph and current state. */
  render() {
    if (!this.isOpen) return;

    const previousViewport = this.mountElement.querySelector?.('.skill-tree-viewport');
    const previousScroll = previousViewport
      ? { left: previousViewport.scrollLeft, top: previousViewport.scrollTop }
      : null;

    if (!this.selectedUpgradeId || !UPGRADE_BY_ID[this.selectedUpgradeId]) {
      this.selectedUpgradeId = this.getDefaultSelection();
    }

    const panel = document.createElement('section');
    panel.className = 'modal-panel skill-tree-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'skills-panel-title');

    const header = document.createElement('header');
    header.className = 'skill-tree-header';

    const headingGroup = document.createElement('div');
    const heading = document.createElement('h2');
    heading.id = 'skills-panel-title';
    heading.textContent = 'Skills';

    const subtitle = document.createElement('p');
    subtitle.className = 'skill-tree-subtitle';
    subtitle.textContent = 'Unlock connected nodes. Scroll the tree to explore every branch.';
    headingGroup.append(heading, subtitle);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'skill-tree-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close skills');
    close.addEventListener('click', this.onClose);
    header.append(headingGroup, close);

    const legend = this.createLegend();
    const viewport = this.createTreeViewport();
    const detail = document.createElement('section');
    detail.className = 'skill-detail';
    detail.dataset.skillDetail = '';
    detail.setAttribute('aria-live', 'polite');

    panel.append(header, legend, viewport, detail);
    this.mountElement.replaceChildren(panel);
    this.renderDetails();

    if (previousScroll) {
      viewport.scrollLeft = previousScroll.left;
      viewport.scrollTop = previousScroll.top;
    } else {
      this.centerSelectedNode(viewport);
    }
  }

  createLegend() {
    const legend = document.createElement('div');
    legend.className = 'skill-tree-legend';
    legend.setAttribute('aria-label', 'Skill node states');

    for (const [className, label] of [
      ['purchased', 'Purchased'],
      ['available', 'Can buy'],
      ['insufficient-xp', 'Need XP'],
      ['locked', 'Locked'],
    ]) {
      const item = document.createElement('span');
      const dot = document.createElement('span');
      dot.className = `skill-tree-legend__dot skill-tree-legend__dot--${className}`;
      dot.setAttribute('aria-hidden', 'true');
      item.append(dot, document.createTextNode(label));
      legend.append(item);
    }

    return legend;
  }

  createTreeViewport() {
    const viewport = document.createElement('div');
    viewport.className = 'skill-tree-viewport';
    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', 'Scrollable skill tree');

    const canvas = document.createElement('div');
    canvas.className = 'skill-tree-canvas';
    canvas.style.width = `${TREE_WIDTH}px`;
    canvas.style.height = `${TREE_HEIGHT}px`;

    const connections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connections.classList.add('skill-tree-connections');
    connections.setAttribute('viewBox', `0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`);
    connections.setAttribute('aria-hidden', 'true');

    for (const definition of UPGRADE_DEFINITIONS) {
      const childPosition = SKILL_TREE_LAYOUT[definition.id];
      if (!childPosition) continue;

      for (const prerequisiteId of definition.prerequisites) {
        const parentPosition = SKILL_TREE_LAYOUT[prerequisiteId];
        if (!parentPosition) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', parentPosition.x);
        line.setAttribute('y1', parentPosition.y);
        line.setAttribute('x2', childPosition.x);
        line.setAttribute('y2', childPosition.y);
        line.classList.add('skill-connector', `skill-connector--${this.getConnectionState(prerequisiteId, definition.id)}`);
        connections.append(line);
      }
    }

    const nodes = document.createElement('div');
    nodes.className = 'skill-tree-nodes';

    for (const definition of UPGRADE_DEFINITIONS) {
      const node = this.createSkillNode(definition);
      if (node) nodes.append(node);
    }

    canvas.append(connections, nodes);
    viewport.append(canvas);
    return viewport;
  }

  createSkillNode(definition) {
    const position = SKILL_TREE_LAYOUT[definition.id];
    if (!position) return null;

    const status = this.progressionManager.getPurchaseStatus(definition.id);
    const purchased = this.progressionManager.hasUpgrade(definition.id);
    const presentation = getSkillNodePresentation({ purchased, status });

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `skill-node skill-node--${presentation.className}`;
    node.dataset.upgradeId = definition.id;
    node.dataset.state = presentation.className;
    node.style.left = `${position.x}px`;
    node.style.top = `${position.y}px`;
    node.setAttribute('aria-pressed', definition.id === this.selectedUpgradeId ? 'true' : 'false');
    node.setAttribute('aria-label', `${definition.name}: ${this.getStatusLabel(definition, status, purchased, presentation.label)}`);

    if (definition.id === this.selectedUpgradeId) node.classList.add('skill-node--selected');

    const sigil = document.createElement('span');
    sigil.className = 'skill-node__sigil';
    sigil.textContent = position.sigil;

    const label = document.createElement('span');
    label.className = 'skill-node__label';
    label.textContent = definition.name;

    node.append(sigil, label);
    node.addEventListener('click', () => this.selectUpgrade(definition.id));
    return node;
  }

  selectUpgrade(upgradeId) {
    this.selectedUpgradeId = upgradeId;

    for (const node of this.mountElement.querySelectorAll?.('.skill-node') ?? []) {
      const selected = node.dataset.upgradeId === upgradeId;
      node.classList.toggle('skill-node--selected', selected);
      node.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }

    this.renderDetails();
  }

  renderDetails() {
    const detail = this.mountElement.querySelector?.('[data-skill-detail]');
    const definition = UPGRADE_BY_ID[this.selectedUpgradeId];
    if (!detail || !definition) return;

    const status = this.progressionManager.getPurchaseStatus(definition.id);
    const purchased = this.progressionManager.hasUpgrade(definition.id);
    const presentation = getSkillNodePresentation({ purchased, status });

    detail.className = `skill-detail skill-detail--${presentation.className}`;
    detail.dataset.state = presentation.className;

    const titleRow = document.createElement('div');
    titleRow.className = 'skill-detail__title-row';

    const name = document.createElement('h3');
    name.textContent = definition.name;

    const badge = document.createElement('span');
    badge.className = 'skill-detail__badge';
    badge.textContent = presentation.label;
    titleRow.append(name, badge);

    const description = document.createElement('p');
    description.className = 'skill-detail__description';
    description.textContent = definition.description;

    const meta = document.createElement('div');
    meta.className = 'skill-detail__meta';

    const cost = document.createElement('span');
    cost.textContent = `Cost: ${definition.costXp.toLocaleString()} XP`;

    const requirements = document.createElement('span');
    requirements.textContent = this.getPrerequisiteLabel(definition);
    meta.append(cost, requirements);

    const state = document.createElement('p');
    state.className = 'skill-detail__status';
    state.textContent = this.getStatusLabel(definition, status, purchased, presentation.label);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-detail__purchase';
    button.disabled = !status.ok;
    button.textContent = purchased
      ? 'Purchased'
      : status.ok
        ? `Unlock for ${definition.costXp.toLocaleString()} XP`
        : presentation.label;
    button.setAttribute(
      'aria-label',
      purchased
        ? `${definition.name} purchased`
        : `Unlock ${definition.name} for ${definition.costXp.toLocaleString()} XP`,
    );
    button.addEventListener('click', () => this.onPurchase(definition.id));

    detail.replaceChildren(titleRow, description, meta, state, button);
  }

  getDefaultSelection() {
    const purchasable = UPGRADE_DEFINITIONS.find(
      (definition) => this.progressionManager.getPurchaseStatus(definition.id).ok,
    );
    if (purchasable) return purchasable.id;

    const reachable = UPGRADE_DEFINITIONS.find(
      (definition) =>
        !this.progressionManager.hasUpgrade(definition.id) &&
        this.progressionManager.prerequisitesMet(definition.id),
    );
    return reachable?.id ?? UPGRADE_DEFINITIONS[0].id;
  }

  getConnectionState(prerequisiteId, childId) {
    if (this.progressionManager.hasUpgrade(prerequisiteId)) {
      return this.progressionManager.hasUpgrade(childId) ? 'purchased' : 'reachable';
    }
    return 'locked';
  }

  getPrerequisiteLabel(definition) {
    if (definition.prerequisites.length === 0) return 'Starting node';
    const names = definition.prerequisites.map((id) => UPGRADE_BY_ID[id]?.name ?? id);
    return `Requires: ${names.join(' + ')}`;
  }

  centerSelectedNode(viewport) {
    const position = SKILL_TREE_LAYOUT[this.selectedUpgradeId];
    if (!position) return;

    viewport.scrollLeft = Math.max(0, position.x - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, position.y - 140);
  }

  /** Build a readable UI-only explanation for an authoritative purchase status. */
  getStatusLabel(definition, status, purchased, fallbackLabel) {
    if (purchased || status.ok) return fallbackLabel;

    if (status.reason === 'PREREQUISITES') {
      const unmet = definition.prerequisites
        .filter((id) => !this.progressionManager.hasUpgrade(id))
        .map((id) => UPGRADE_BY_ID[id]?.name ?? id);
      return `Locked: requires ${unmet.join(', ')}`;
    }

    if (status.reason === 'LIFETIME_XP_GATE') {
      return `Locked: requires ${definition.unlockLifetimeXp.toLocaleString()} lifetime XP`;
    }

    if (status.reason === 'INSUFFICIENT_XP') {
      return `Need ${definition.costXp.toLocaleString()} XP`;
    }

    return fallbackLabel;
  }
}
