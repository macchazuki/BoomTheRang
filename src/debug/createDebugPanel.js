const THROW_UPGRADES = ['twinThrow', 'tripleThrow', 'quadThrow'];

function button(label, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return element;
}

function setCountUpgrades(gameState, ids, count) {
  ids.forEach((id, index) => {
    gameState.upgrades[id] = index < count - 1;
  });
}

export function createDebugPanel(app) {
  const root = document.createElement('aside');
  root.className = 'debug-panel';
  root.innerHTML = `
    <button type="button" class="debug-panel__toggle">Debug</button>
    <div class="debug-panel__body" hidden>
      <strong>Debug build</strong>
      <div class="debug-panel__status"></div>
      <div class="debug-panel__group debug-panel__xp"></div>
      <div class="debug-panel__group debug-panel__combo"></div>
      <div class="debug-panel__group debug-panel__boomerangs"></div>
      <div class="debug-panel__group debug-panel__speed"></div>
      <div class="debug-panel__group debug-panel__actions"></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .debug-panel { position: fixed; z-index: 10000; right: 8px; top: 8px; font: 12px/1.3 system-ui, sans-serif; color: #fff; }
    .debug-panel button { min-height: 32px; border: 1px solid #777; border-radius: 6px; background: #222; color: #fff; padding: 6px 9px; }
    .debug-panel__toggle { float: right; }
    .debug-panel__body { clear: both; width: min(300px, calc(100vw - 16px)); margin-top: 6px; padding: 10px; border: 1px solid #777; border-radius: 8px; background: rgba(15, 15, 15, .94); }
    .debug-panel__status { margin: 6px 0; white-space: pre-line; }
    .debug-panel__group { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  `;
  document.head.append(style);
  document.body.append(root);

  const body = root.querySelector('.debug-panel__body');
  const status = root.querySelector('.debug-panel__status');
  root.querySelector('.debug-panel__toggle').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    body.hidden = !body.hidden;
    renderStatus();
  });

  const applyEffects = () => {
    const effects = app.progressionManager.getDerivedEffects();
    app.gameController?.applyProgressionEffects(effects);
    app.gameController?.renderMirrors();
    renderStatus();
  };

  const renderStatus = () => {
    const effects = app.progressionManager.getDerivedEffects();
    status.textContent = [
      `XP: ${Math.round(app.gameState.xp)}  Combo: ${app.gameState.gameplay.combo}`,
      `Boomerangs: ${effects.playerBoomerangCount}  Targets: ${effects.targetCount}`,
      `Speed: ${app.debugTimeScale}x`,
    ].join('\n');
  };

  const xpGroup = root.querySelector('.debug-panel__xp');
  [100, 1000, 10000].forEach((amount) => xpGroup.append(button(`+${amount} XP`, () => {
    app.gameState.addXp(amount);
    app.gameController?.renderMirrors();
    renderStatus();
  })));

  const comboGroup = root.querySelector('.debug-panel__combo');
  comboGroup.append(
    button('Combo 0', () => { app.gameState.setCombo(0); app.gameController?.renderMirrors(); renderStatus(); }),
    button('Combo +1', () => { app.gameState.setCombo(app.gameState.gameplay.combo + 1); app.gameController?.renderMirrors(); renderStatus(); }),
  );

  const boomerangGroup = root.querySelector('.debug-panel__boomerangs');
  [1, 2, 3, 4].forEach((count) => boomerangGroup.append(button(`${count} boomerang${count === 1 ? '' : 's'}`, () => {
    setCountUpgrades(app.gameState, THROW_UPGRADES, count);
    applyEffects();
  })));

  const speedGroup = root.querySelector('.debug-panel__speed');
  [1, 2, 5, 10].forEach((speed) => speedGroup.append(button(`${speed}x`, () => {
    app.debugTimeScale = speed;
    renderStatus();
  })));

  const actionGroup = root.querySelector('.debug-panel__actions');
  actionGroup.append(
    button('Start game', () => { app.startGame(); renderStatus(); }),
    button('Upgrades', () => { app.openUpgrades(); renderStatus(); }),
    button('Reset debug save', () => {
      app.saveManager.clear();
      location.reload();
    }),
  );

  const refreshId = window.setInterval(() => {
    if (!body.hidden) renderStatus();
  }, 500);

  renderStatus();

  return () => {
    window.clearInterval(refreshId);
    root.remove();
    style.remove();
  };
}
