const i=["twinThrow","tripleThrow","quadThrow"];function d(e,t){const r=document.createElement("button");return r.type="button",r.textContent=e,r.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),t()}),r}function b(e,t,r){t.forEach((a,s)=>{e.upgrades[a]=s<r-1})}function f(e){const t=document.createElement("aside");t.className="debug-panel",t.innerHTML=`
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
  `;const r=document.createElement("style");r.textContent=`
    .debug-panel { position: fixed; z-index: 10000; right: 8px; top: 8px; font: 12px/1.3 system-ui, sans-serif; color: #fff; }
    .debug-panel button { min-height: 32px; border: 1px solid #777; border-radius: 6px; background: #222; color: #fff; padding: 6px 9px; }
    .debug-panel__toggle { float: right; }
    .debug-panel__body { clear: both; width: min(300px, calc(100vw - 16px)); margin-top: 6px; padding: 10px; border: 1px solid #777; border-radius: 8px; background: rgba(15, 15, 15, .94); }
    .debug-panel__status { margin: 6px 0; white-space: pre-line; }
    .debug-panel__group { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  `,document.head.append(r),document.body.append(t);const a=t.querySelector(".debug-panel__body"),s=t.querySelector(".debug-panel__status");t.querySelector(".debug-panel__toggle").addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),a.hidden=!a.hidden,n()});const g=()=>{const o=e.progressionManager.getDerivedEffects();e.gameController?.applyProgressionEffects(o),e.gameController?.renderMirrors(),n()},n=()=>{const o=e.progressionManager.getDerivedEffects();s.textContent=[`XP: ${Math.round(e.gameState.xp)}  Combo: ${e.gameState.gameplay.combo}`,`Boomerangs: ${o.playerBoomerangCount}  Targets: ${o.targetCount}`,`Speed: ${e.debugTimeScale}x`].join(`
`)},l=t.querySelector(".debug-panel__xp");[100,1e3,1e4].forEach(o=>l.append(d(`+${o} XP`,()=>{e.gameState.addXp(o),e.gameController?.renderMirrors(),n()}))),t.querySelector(".debug-panel__combo").append(d("Combo 0",()=>{e.gameState.setCombo(0),e.gameController?.renderMirrors(),n()}),d("Combo +1",()=>{e.gameState.setCombo(e.gameState.gameplay.combo+1),e.gameController?.renderMirrors(),n()}));const u=t.querySelector(".debug-panel__boomerangs");[1,2,3,4].forEach(o=>u.append(d(`${o} boomerang${o===1?"":"s"}`,()=>{b(e.gameState,i,o),g()})));const c=t.querySelector(".debug-panel__speed");[1,2,5,10].forEach(o=>c.append(d(`${o}x`,()=>{e.debugTimeScale=o,n()}))),t.querySelector(".debug-panel__actions").append(d("Start game",()=>{e.startGame(),n()}),d("Upgrades",()=>{e.openUpgrades(),n()}),d("Reset debug save",()=>{e.saveManager.clear(),location.reload()}));const p=window.setInterval(()=>{a.hidden||n()},500);return n(),()=>{window.clearInterval(p),t.remove(),r.remove()}}export{f as createDebugPanel};
