'use strict';
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let research;
const heroStudies = {
 carmilla: {
  title:'Blood connects the kit. Conditions narrow the payoff.',
  loop:[['Build blood','ATTACK, SPECIAL, Puncture'],['Spend or hold','POWER / DEFENSE / Winged Form'],['Earn a payoff','Channel damage, mobility, Impalement']],
  mechanics:'Her blood economy reaches several abilities. Bleed connects ATTACK and DEFENSE to Flesh Rip and Sadism. Injection already connects SPECIAL to a POWER explosion; Victimization is a broad damage setup.',
  strength:'There are multiple starting points for a hybrid build. Mobility can generate fuel, defense can establish a status, and SPECIAL can set up damage from another ability.',
  friction:'Some payoffs depend on how an action happened, not merely its label. A generated explosion may miss a held-cast gate. A damage ramp competes with the time remaining on bleed. Starter talents are mutually exclusive in normal play.',
  lesson:'Your Blood Reserve edit adds a visible ATTACK payoff, but also asks players to preserve the resource their other actions consume. Your Onslaught edit offers a new SPECIAL → DASH bridge; selector priority decides whether that bridge is actually available.',
  caveat:'This is a partial graph analysis, not a declaration that Carmilla is weak. A narrow, reliable payoff can be good design. The test is whether its cost and availability make sense in play.',
  source:'review.md',sourceLabel:'Supplied package review'
 },
 scarlet:{
  title:'One resource supports several useful actions.',
  loop:[['Generate combo points','Murderous Intent / Double Strike'],['Spend combo points','POWER / Pulverize / Fan of Spikes'],['Reinforce the loop','Adrenaline / Savagery']],
  mechanics:'Murderous Intent grants points from DEFENSE. Double Strike links DASH to ATTACK and a point. Adrenaline rewards spending with healing or attack speed; Savagery rewards both earning and spending with DMG. Energy adds capacity and POWER crit chance per stored point.',
  strength:'Generation, spending, and general rewards share a consistent currency. A defensive or movement choice can feed offense; spending can help the player survive or generate the next round. Energy also gives storage an explicit payoff.',
  friction:'This does not make every route equally good. Devourer requires werewolf POWER kills, and transformation affects access to rewards. Extra capacity is only valuable if you can fill and use it. Specific attack effects may not inherit every other attack talent.',
  lesson:'The useful comparison for Blood Reserve is not simply “Scarlet has capacity too.” It is whether storing, acquiring, and spending the resource each have understandable uses, with several ways to participate.',
  caveat:'Scarlet is not a finished ideal: the 1.06 developers explicitly replaced several talents because repetitive cooldown effects overlapped with items. Judge the current shared loop, not an assumption of universal synergy.',
  source:'https://buildmaker.ravenswatch.com/api/game-heroes/scarlet?lang=en',sourceLabel:'Official Scarlet card data, retrieved 26 Nov 2026'
 },
 aladdin:{
  title:'Movement and retrieval turn setup into opportunity.',
  loop:[['Create an opportunity','SPECIAL blades / DEFENSE jump'],['Move through it','Catch blades / Air Dash'],['Convert into offense','Spinning Strikes / Leaping Strike']],
  mechanics:'Acrobatics generates enchantment during DEFENSE. Air Dash allows DASH in the jump and grants attack speed. Leaping Strike rewards ATTACK after DASH and improves with enchantment. Catching blades feeds Spinning Strikes; Swordjinn lets POWER catch them. Enchanted Jinn spends enchantment for POWER crit chance.',
  strength:'Actions connect through both a resource and a spatial rhythm. Movement can be safety, setup, and an offensive opportunity. Several talents reward a sequence the player can deliberately reproduce.',
  friction:'The connections have costs: holding off ATTACK for Major Enchantment competes with attacking, and blade retrieval asks for positioning. They should not be mistaken for free bonuses or proof that every talent combines.',
  lesson:'Jinn Charge now gives a POWER → DASH route, while Spectral Blades rewards active retrieval. The useful benchmark is a clear handoff between actions. Carmilla’s proposed SPECIAL → DASH rush can aim for that clarity without needing identical mechanics.',
  caveat:'The 1.06 developers replaced Cyclonic Appearance and Dancing Blades because their interactions were too limited. Aladdin is a good example of targeted repairs, not evidence that his kit has always been seamless.',
  source:'https://buildmaker.ravenswatch.com/api/game-heroes/aladdin?lang=en',sourceLabel:'Official Aladdin card data, retrieved 26 Nov 2026'
 }
};
function route(){
 const page=location.hash.slice(1)||'talent-map';
 const allowed=['inventory','base-kits','talent-map','review','connections','feedback'];
 const active=allowed.includes(page)?page:'talent-map';
 if(page==='overview'||page==='sources')history.replaceState(null,'','#talent-map');
 document.querySelectorAll('.page').forEach(el=>{el.hidden=el.id!==active;});
 document.querySelectorAll('[data-page]').forEach(el=>{if(el.dataset.page===active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 document.title=`Carmilla — ${$(`#${active} h1`).textContent.replace(/\s+/g,' ')}`;
}
function renderTalents(){
 const query=$('#search').value.trim().toLowerCase(); const tier=$('#tier').value; const family=$('#family').value;
 const mod=$('input[name=reference]:checked').value==='mod';
 const focus=$('#inventory-focus').checked;
 const filtered=research.talents.filter(t=>(!focus||window.reworkFocus.has(t.name))&&(!tier||t.tier===tier)&&(!family||(mod?(t.modTags||t.tags):t.tags).includes(family))&&(!query||[t.name,t.key,t.trigger,t.effect,t.modEffect,t.synergy,t.gap,...t.tags].join(' ').toLowerCase().includes(query)));
 $('#result-count').textContent=`${filtered.length} of 26 talents`;
 $('#reference-note').textContent=mod?'Modified package snapshot. Only the documented changes are highlighted; this is not a complete diff against pristine game files.':'Published game reference, cross-checked against the supplied card text. The underlying files are modded; they are not a pristine vanilla baseline.';
 $('#empty').hidden=filtered.length>0;
 $('#talents').innerHTML=filtered.map(t=>`<details class="talent" id="talent-${esc(t.id)}"><summary><span class="talent-name"><strong class="${window.reworkFocus.has(t.name)?'rework-focus':''}">${esc(t.name)}</strong>${window.reworkFocus.has(t.name)?'<small class="focus-label">Rework focus</small>':''}<small>${esc(t.tier)} · internal ${esc(t.slot)}</small></span><span class="talent-trigger">${esc(mod?t.modTrigger:t.trigger)}</span><span class="talent-tags">${esc((mod?(t.modTags||t.tags):t.tags).join(' · '))}</span><span class="tag ${t.status.includes('Changed')?'changed':''}">${esc(t.status)}</span></summary><div class="talent-content"><p class="effect">${esc(mod?t.modEffect:t.effect)}</p><p class="small">Affects: ${esc((mod?(t.modTags||t.tags):t.tags).join(', '))}</p><div class="detail-columns"><div><h3>Connections worth understanding</h3><p>${esc(t.synergy)}</p></div><div><h3>Where the connection gets fragile</h3><p>${esc(t.gap)}</p></div></div><details class="evidence-details"><summary>Where this lives · ${t.components.length} mapped components</summary><p>Internal group: <code>${esc(t.group)}</code>. Card identity and group mapping are established. Component presence does not prove every runtime interaction.</p><p>Base: <code>Hero_Carmilla.entity.ot.EntitySettingsResource.gen</code><br>Update6: <code>Hero_Carmilla_Update6.entity.ot.EntitySettingsResource.gen</code></p><ul>${t.components.map(c=>`<li>${esc(c.layer)} #${c.index} — ${esc(c.name)}</li>`).join('')}</ul><p><strong>Other groups referencing these components:</strong> ${esc([...new Set(t.consumers.map(c=>c.group))].join(', ')||'No additional top-level references decoded.')}. This list does not include all references inside owned subobjects or missing inherited files.</p><a href="evidence.txt" class="text-link">Open decoded field evidence</a></details></div></details>`).join('');
}
function resetFilters(){ $('#search').value=''; $('#tier').value=''; $('#family').value=''; $('#inventory-focus').checked=false; renderTalents(); $('#search').focus(); }
function renderStudy(hero){
 const h=heroStudies[hero];
 document.querySelectorAll('[data-hero]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.hero===hero)));
 $('#hero-study').innerHTML=`<h2>${esc(h.title)}</h2><div class="loop" aria-label="${esc(hero)} build connections">${h.loop.map((n,i)=>`${i?'<span class="loop-arrow" aria-hidden="true">→</span>':''}<div class="loop-node"><strong>${esc(n[0])}</strong><span>${esc(n[1])}</span></div>`).join('')}</div><p>${esc(h.mechanics)}</p><div class="study-columns"><div><h3>Why this can feel connected</h3><p>${esc(h.strength)}</p><h3>The useful comparison</h3><p>${esc(h.lesson)}</p></div><div><h3>Where it still asks something of you</h3><p>${esc(h.friction)}</p></div></div><p class="study-caveat">${esc(h.caveat)}</p><p class="source-line"><a href="${esc(h.source)}" target="_blank" rel="noreferrer">${esc(h.sourceLabel)}</a> · <a href="https://store.steampowered.com/news/app/2071280/view/713409051455653305" target="_blank" rel="noreferrer">Official 1.06 design notes</a>. Connections are analysis; runtime effect inheritance is not comprehensively tested.</p>`;
}
function timing(){
 const bleed=Number($('#bleed').value),delay=Number($('#delay').value),overlap=Math.max(0,bleed-delay-3);
 $('#bleed-value').textContent=`${bleed} s`;
 $('#delay-value').textContent=`${delay} s`;
 $('#bleed-bar').style.width=`${bleed*10}%`;
 $('#ramp-bar').style.left=`${delay*10}%`;
 $('#ramp-bar').style.width='30%';
 $('#overlap-bar').style.left=`${(delay+3)*10}%`;
 $('#overlap-bar').style.width=`${overlap*10}%`;
 const text=overlap>0?`${overlap.toFixed(2).replace(/\.?0+$/,'')} seconds of possible full-ramp overlap.`:'No full-ramp overlap under these assumptions.';
 $('#timing-result').textContent=text;
 $('#timeline').setAttribute('aria-label',`Bleed lasts ${bleed} seconds, POWER starts after ${delay} seconds and ramps for 3 seconds. ${text}`);
}
async function init(){
 try{const response=await fetch('research.json');if(!response.ok)throw new Error(`Inventory returned ${response.status}`);research=await response.json();
 $('#findings').innerHTML=research.findings.map(f=>`<article class="finding" id="${esc(f.id)}"><div class="finding-title"><span class="severity">${esc(f.severity)}</span><h2>${esc(f.title)}</h2></div><p>${esc(f.impact)}</p><p class="evidence"><strong>Evidence.</strong> ${esc(f.evidence)}</p><p><strong>Next check.</strong> ${esc(f.action)}</p><p class="small">${esc(f.confidence)}</p></article>`).join('');
 $('#feedback-items').innerHTML=research.feedback.map(f=>`<article class="feedback-item"><blockquote>${esc(f.quote)}</blockquote><div><h2>${esc(f.verdict)}</h2><p>${esc(f.analysis)}</p><p class="test-prompt"><strong>A controlled check</strong>${esc(f.test)}</p></div></article>`).join('');
 for(const el of document.querySelectorAll('#search,#tier,#family,#inventory-focus,input[name=reference]'))el.addEventListener(el.id==='search'?'input':'change',renderTalents);
 $('#reset').addEventListener('click',resetFilters);$('#reset-empty').addEventListener('click',resetFilters);
 document.querySelectorAll('[data-hero]').forEach(el=>el.addEventListener('click',()=>renderStudy(el.dataset.hero)));
 $('#bleed').addEventListener('input',timing);$('#delay').addEventListener('input',timing);
 renderTalents();renderStudy('carmilla');timing();$('#loading').hidden=true;route();
 }catch(error){$('#loading').textContent=`The inventory could not load. Reload this local page or open context.md for the written findings. ${error.message}`;}
}
window.addEventListener('hashchange',()=>{route();$('#main').focus({preventScroll:true});window.scrollTo(0,0);});
route();
init();
