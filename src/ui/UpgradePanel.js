import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from '../progression/upgradeDefinitions.js';

const TREE_WIDTH = 620;
const TREE_HEIGHT = 900;

export const SKILL_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'xp', label: 'Damage', root: 'betterTraining1', skills: Object.freeze(['betterTraining1', 'betterTraining2', 'betterTraining3']) }),
  Object.freeze({ id: 'criticals', label: 'Criticals', root: 'criticalTraining1', skills: Object.freeze(['criticalTraining1', 'megaCritical', 'criticalTraining2', 'ultraCritical', 'criticalMastery', 'omegaCritical']) }),
  Object.freeze({ id: 'precision', label: 'Precision', root: 'steadyHands1', skills: Object.freeze(['steadyHands1', 'steadyHands2', 'perfectWindow1', 'perfectWindow2', 'quickReload1', 'quickReload2', 'quickReload3', 'recoveryMastery']) }),
  Object.freeze({ id: 'arsenal', label: 'Arsenal', root: 'twinThrow', skills: Object.freeze(['twinThrow', 'comboTraining', 'tripleThrow', 'quadThrow', 'comboMastery', 'boomerangMastery', 'grandmaster']) }),
  Object.freeze({ id: 'pet', label: 'Pet', root: 'dogCompanion', skills: Object.freeze(['dogCompanion', 'dogTraining1', 'dogTraining2', 'dogTraining3', 'fastFetch1', 'fastFetch2', 'fetchMastery', 'fastFetch3']) }),
]);

export const SKILL_CATEGORY_BY_ID = Object.freeze(Object.fromEntries(SKILL_CATEGORIES.map((category) => [category.id, category])));
export const SKILL_CATEGORY_BY_UPGRADE = Object.freeze(Object.fromEntries(SKILL_CATEGORIES.flatMap((category) => category.skills.map((id) => [id, category.id]))));

const STATUS_PRESENTATION = Object.freeze({
  purchased: Object.freeze({ className: 'purchased', label: 'Purchased' }),
  available: Object.freeze({ className: 'available', label: 'Available' }),
  INSUFFICIENT_XP: Object.freeze({ className: 'insufficient-xp', label: 'Not enough XP' }),
  PREREQUISITES: Object.freeze({ className: 'locked', label: 'Locked' }),
  LIFETIME_XP_GATE: Object.freeze({ className: 'locked', label: 'Locked' }),
});

/** Category-local coordinates keep paths short and prevent unrelated branches crossing. */
export const SKILL_TREE_LAYOUT = Object.freeze({
  betterTraining1: Object.freeze({ x: 310, y: 90, sigil: 'DMG' }), betterTraining2: Object.freeze({ x: 310, y: 270, sigil: 'II' }), betterTraining3: Object.freeze({ x: 310, y: 450, sigil: 'III' }),
  criticalTraining1: Object.freeze({ x: 310, y: 80, sigil: 'CR' }), megaCritical: Object.freeze({ x: 190, y: 230, sigil: 'MC' }), criticalTraining2: Object.freeze({ x: 430, y: 230, sigil: 'II' }), ultraCritical: Object.freeze({ x: 190, y: 400, sigil: 'UC' }), criticalMastery: Object.freeze({ x: 430, y: 400, sigil: 'CM' }), omegaCritical: Object.freeze({ x: 310, y: 590, sigil: 'OC' }),
  steadyHands1: Object.freeze({ x: 310, y: 70, sigil: 'PR' }), steadyHands2: Object.freeze({ x: 190, y: 230, sigil: 'II' }), perfectWindow1: Object.freeze({ x: 190, y: 400, sigil: 'PW' }), perfectWindow2: Object.freeze({ x: 190, y: 570, sigil: 'II' }), quickReload1: Object.freeze({ x: 430, y: 230, sigil: 'RL' }), quickReload2: Object.freeze({ x: 430, y: 400, sigil: 'II' }), quickReload3: Object.freeze({ x: 430, y: 570, sigil: 'III' }), recoveryMastery: Object.freeze({ x: 430, y: 740, sigil: 'RM' }),
  twinThrow: Object.freeze({ x: 310, y: 60, sigil: '×2' }), comboTraining: Object.freeze({ x: 450, y: 220, sigil: 'CO' }), tripleThrow: Object.freeze({ x: 170, y: 220, sigil: '×3' }), quadThrow: Object.freeze({ x: 310, y: 390, sigil: '×4' }), comboMastery: Object.freeze({ x: 450, y: 550, sigil: 'CM' }), boomerangMastery: Object.freeze({ x: 310, y: 700, sigil: 'BM' }), grandmaster: Object.freeze({ x: 500, y: 810, sigil: 'GM' }),
  dogCompanion: Object.freeze({ x: 310, y: 80, sigil: 'DOG' }), dogTraining1: Object.freeze({ x: 190, y: 240, sigil: 'DT' }), dogTraining2: Object.freeze({ x: 190, y: 400, sigil: 'II' }), fastFetch1: Object.freeze({ x: 430, y: 240, sigil: 'FF' }), fastFetch2: Object.freeze({ x: 430, y: 400, sigil: 'II' }), fetchMastery: Object.freeze({ x: 310, y: 560, sigil: 'FM' }), dogTraining3: Object.freeze({ x: 190, y: 720, sigil: 'III' }), fastFetch3: Object.freeze({ x: 430, y: 720, sigil: 'III' }),
});

export function getSkillNodePresentation({ purchased, status }) { if (purchased) return STATUS_PRESENTATION.purchased; if (status.ok) return STATUS_PRESENTATION.available; return STATUS_PRESENTATION[status.reason] ?? STATUS_PRESENTATION.PREREQUISITES; }

export function categoryHasPurchasableSkill(category, progressionManager) {
  return category.skills.some((upgradeId) => progressionManager.getPurchaseStatus(upgradeId).ok);
}

export class UpgradePanel {
  constructor({ mountElement, progressionManager, onPurchase, onClose }) { this.mountElement = mountElement; this.progressionManager = progressionManager; this.onPurchase = onPurchase; this.onClose = onClose; this.isOpen = false; this.selectedUpgradeId = null; this.activeCategoryId = 'xp'; }
  open() { this.isOpen = true; this.mountElement.hidden = false; this.render(); }
  close() { this.isOpen = false; this.mountElement.hidden = true; this.mountElement.replaceChildren(); }

  render() {
    if (!this.isOpen) return;
    const category = SKILL_CATEGORY_BY_ID[this.activeCategoryId] ?? SKILL_CATEGORIES[0];
    if (!this.selectedUpgradeId || SKILL_CATEGORY_BY_UPGRADE[this.selectedUpgradeId] !== category.id) this.selectedUpgradeId = this.getDefaultSelection(category);
    const panel = document.createElement('section'); panel.className = 'modal-panel skill-tree-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'skills-panel-title');
    const header = document.createElement('header'); header.className = 'skill-tree-header';
    const heading = document.createElement('h2'); heading.id = 'skills-panel-title'; heading.textContent = 'Skills';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'skill-tree-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close skills'); close.addEventListener('click', this.onClose); header.append(heading, close);
    const tabs = this.createCategoryTabs(); const legend = this.createLegend(); const viewport = this.createTreeViewport(category); const detail = document.createElement('section'); detail.className = 'skill-detail'; detail.dataset.skillDetail = ''; detail.setAttribute('aria-live', 'polite');
    panel.append(header, tabs, legend, viewport, detail); this.mountElement.replaceChildren(panel); this.renderDetails(); this.centerSelectedNode(viewport);
  }

  createCategoryTabs() {
    const tabs = document.createElement('div'); tabs.className = 'skill-category-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Skill categories');
    for (const category of SKILL_CATEGORIES) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'skill-category-tab'; button.dataset.categoryId = category.id;
      const active = category.id === this.activeCategoryId; const hasAvailableUpgrade = categoryHasPurchasableSkill(category, this.progressionManager);
      button.classList.toggle('skill-category-tab--active', active); button.classList.toggle('skill-category-tab--has-upgrade', hasAvailableUpgrade);
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', active ? 'true' : 'false'); button.setAttribute('aria-label', hasAvailableUpgrade ? `${category.label}, upgrade available` : category.label);
      const label = document.createElement('span'); label.textContent = category.label; button.append(label);
      if (hasAvailableUpgrade) { const indicator = document.createElement('span'); indicator.className = 'skill-category-tab__indicator'; indicator.setAttribute('aria-hidden', 'true'); button.append(indicator); }
      button.addEventListener('click', () => { if (category.id === this.activeCategoryId) return; this.activeCategoryId = category.id; this.selectedUpgradeId = null; this.render(); }); tabs.append(button);
    }
    return tabs;
  }

  createLegend() { const legend = document.createElement('div'); legend.className = 'skill-tree-legend'; legend.setAttribute('aria-label', 'Skill node states'); for (const [className, label] of [['purchased','Purchased'],['available','Can buy'],['insufficient-xp','Need XP'],['locked','Locked']]) { const item = document.createElement('span'); const dot = document.createElement('span'); dot.className = `skill-tree-legend__dot skill-tree-legend__dot--${className}`; dot.setAttribute('aria-hidden','true'); item.append(dot, document.createTextNode(label)); legend.append(item); } return legend; }

  createTreeViewport(category) {
    const viewport = document.createElement('div'); viewport.className = 'skill-tree-viewport'; viewport.tabIndex = 0; viewport.setAttribute('aria-label', `${category.label} skill tree`);
    const canvas = document.createElement('div'); canvas.className = 'skill-tree-canvas'; canvas.style.width = `${TREE_WIDTH}px`; canvas.style.height = `${TREE_HEIGHT}px`;
    const connections = document.createElementNS('http://www.w3.org/2000/svg','svg'); connections.classList.add('skill-tree-connections'); connections.setAttribute('viewBox', `0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`); connections.setAttribute('aria-hidden','true'); const categorySkills = new Set(category.skills);
    for (const definition of UPGRADE_DEFINITIONS) { if (!categorySkills.has(definition.id)) continue; const childPosition = SKILL_TREE_LAYOUT[definition.id]; for (const prerequisiteId of definition.prerequisites) { if (!categorySkills.has(prerequisiteId)) continue; const parentPosition = SKILL_TREE_LAYOUT[prerequisiteId]; if (!parentPosition || !childPosition) continue; const line = document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('x1',parentPosition.x); line.setAttribute('y1',parentPosition.y); line.setAttribute('x2',childPosition.x); line.setAttribute('y2',childPosition.y); line.classList.add('skill-connector', `skill-connector--${this.getConnectionState(prerequisiteId, definition.id)}`); connections.append(line); } }
    const nodes = document.createElement('div'); nodes.className = 'skill-tree-nodes'; for (const id of category.skills) { const node = this.createSkillNode(UPGRADE_BY_ID[id]); if (node) nodes.append(node); } canvas.append(connections,nodes); viewport.append(canvas); return viewport;
  }

  createSkillNode(definition) { const position = SKILL_TREE_LAYOUT[definition.id]; if (!position) return null; const status = this.progressionManager.getPurchaseStatus(definition.id); const purchased = this.progressionManager.hasUpgrade(definition.id); const presentation = getSkillNodePresentation({purchased,status}); const node = document.createElement('button'); node.type='button'; node.className=`skill-node skill-node--${presentation.className}`; node.dataset.upgradeId=definition.id; node.dataset.state=presentation.className; node.style.left=`${position.x}px`; node.style.top=`${position.y}px`; node.setAttribute('aria-pressed', definition.id===this.selectedUpgradeId?'true':'false'); node.setAttribute('aria-label', `${definition.name}: ${this.getStatusLabel(definition,status,purchased,presentation.label)}`); if (definition.id===this.selectedUpgradeId) node.classList.add('skill-node--selected'); const sigil=document.createElement('span'); sigil.className='skill-node__sigil'; sigil.textContent=position.sigil; const label=document.createElement('span'); label.className='skill-node__label'; label.textContent=definition.name; node.append(sigil,label); node.addEventListener('click',()=>this.selectUpgrade(definition.id)); return node; }
  selectUpgrade(upgradeId) { this.selectedUpgradeId=upgradeId; for (const node of this.mountElement.querySelectorAll?.('.skill-node')??[]) { const selected=node.dataset.upgradeId===upgradeId; node.classList.toggle('skill-node--selected',selected); node.setAttribute('aria-pressed',selected?'true':'false'); } this.renderDetails(); }

  renderDetails() { const detail=this.mountElement.querySelector?.('[data-skill-detail]'); const definition=UPGRADE_BY_ID[this.selectedUpgradeId]; if(!detail||!definition)return; const status=this.progressionManager.getPurchaseStatus(definition.id); const purchased=this.progressionManager.hasUpgrade(definition.id); const presentation=getSkillNodePresentation({purchased,status}); detail.className=`skill-detail skill-detail--${presentation.className}`; detail.dataset.state=presentation.className; const titleRow=document.createElement('div'); titleRow.className='skill-detail__title-row'; const name=document.createElement('h3'); name.textContent=definition.name; const badge=document.createElement('span'); badge.className='skill-detail__badge'; badge.textContent=presentation.label; titleRow.append(name,badge); const description=document.createElement('p'); description.className='skill-detail__description'; description.textContent=definition.description; const meta=document.createElement('div'); meta.className='skill-detail__meta'; const cost=document.createElement('span'); cost.textContent=`Cost: ${definition.costXp.toLocaleString()} XP`; const requirements=document.createElement('span'); requirements.textContent=this.getPrerequisiteLabel(definition); meta.append(cost,requirements); const state=document.createElement('p'); state.className='skill-detail__status'; state.textContent=this.getStatusLabel(definition,status,purchased,presentation.label); const button=document.createElement('button'); button.type='button'; button.className='skill-detail__purchase'; button.disabled=!status.ok; button.textContent=purchased?'Purchased':status.ok?`Unlock for ${definition.costXp.toLocaleString()} XP`:presentation.label; button.setAttribute('aria-label',purchased?`${definition.name} purchased`:`Unlock ${definition.name} for ${definition.costXp.toLocaleString()} XP`); button.addEventListener('click',()=>this.onPurchase(definition.id)); detail.replaceChildren(titleRow,description,meta,state,button); }

  getDefaultSelection(category) { const definitions=category.skills.map((id)=>UPGRADE_BY_ID[id]); const purchasable=definitions.find((definition)=>this.progressionManager.getPurchaseStatus(definition.id).ok); if(purchasable)return purchasable.id; const reachable=definitions.find((definition)=>!this.progressionManager.hasUpgrade(definition.id)&&this.progressionManager.prerequisitesMet(definition.id)); return reachable?.id??category.root; }
  getConnectionState(prerequisiteId,childId) { if(this.progressionManager.hasUpgrade(prerequisiteId)) return this.progressionManager.hasUpgrade(childId)?'purchased':'reachable'; return 'locked'; }
  getPrerequisiteLabel(definition) { if(definition.prerequisites.length===0)return 'Starting node'; const names=definition.prerequisites.map((id)=>UPGRADE_BY_ID[id]?.name??id); return `Requires: ${names.join(' + ')}`; }
  centerSelectedNode(viewport) { const position=SKILL_TREE_LAYOUT[this.selectedUpgradeId]; if(!position)return; viewport.scrollLeft=Math.max(0,position.x-viewport.clientWidth/2); viewport.scrollTop=Math.max(0,position.y-120); }
  getStatusLabel(definition,status,purchased,fallbackLabel) { if(purchased||status.ok)return fallbackLabel; if(status.reason==='PREREQUISITES'){const unmet=definition.prerequisites.filter((id)=>!this.progressionManager.hasUpgrade(id)).map((id)=>UPGRADE_BY_ID[id]?.name??id); return `Locked: requires ${unmet.join(', ')}`;} if(status.reason==='LIFETIME_XP_GATE')return `Locked: requires ${definition.unlockLifetimeXp.toLocaleString()} lifetime XP`; if(status.reason==='INSUFFICIENT_XP')return `Need ${definition.costXp.toLocaleString()} XP`; return fallbackLabel; }
}
