'use strict';
(() => {
  const select = (query) => document.querySelector(query);
  const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const heroes = ['Carmilla', 'Scarlet', 'Aladdin'];
  const formLabels = {normal:'Normal form', winged:'Winged Form', human:'Human · day', werewolf:'Werewolf · night', base:'Base kit'};
  const roleClass = (role) => ['Generates','Gain payoff'].includes(role) ? 'gain' : ['Consumes','Spend payoff'].includes(role) ? 'spend' : '';
  const badges = (roles) => roles.map(role => `<span class="resource-role ${roleClass(role)}">${escape(role)}</span>`).join('');
  let kits;

  async function readJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return response.json();
  }

  function renderKits() {
    const slot = select('#kit-slot').value;
    const chosen = {Carmilla:select('#kit-carmilla').value, Scarlet:select('#kit-scarlet').value, Aladdin:'base'};
    const rows = kits.rows.filter(row => !slot || row.slot === slot);
    select('#kit-count').textContent = `${rows.length} of 8 ability slots · all 3 heroes`;
    select('#kit-rows').innerHTML = rows.map(row => `<section class="kit-row" aria-labelledby="kit-${row.slot.replaceAll(' ', '-').toLowerCase()}">
      <h2 id="kit-${row.slot.replaceAll(' ', '-').toLowerCase()}">${escape(row.slot)}</h2>
      <div class="kit-grid">${heroes.map(hero => {
        const entries = Object.entries(row[hero]).filter(([form]) => chosen[hero] === 'both' || chosen[hero] === form);
        const same = entries.length > 1 && entries.every(([, cell]) => JSON.stringify(cell) === JSON.stringify(entries[0][1]));
        const variants = same ? [['both', entries[0][1]]] : entries;
        return `<article class="kit-hero"><h3>${hero}</h3>${variants.map(([form, cell]) => `<div class="kit-variant">
          <p class="kit-form">${form === 'both' ? 'Both forms' : formLabels[form]} <span>· ${escape(cell.mode)}</span></p>
          <h4>${escape(cell.name)}</h4>
          <dl><dt>Trigger</dt><dd>${escape(cell.trigger)}</dd><dt>Effect</dt><dd>${escape(cell.effect)}</dd></dl>
          <div class="resource-roles" aria-label="Resource role">${badges(cell.roles)}</div><p class="kit-resource">${escape(cell.resource)}</p>
        </div>`).join('')}</article>`;
      }).join('')}</div></section>`).join('');
  }

  function renderComparison(grouping, records) {
    select('#comparison-rows').innerHTML = grouping.sections.map(section => `<tr data-section="${escape(section.id)}">
      <th scope="row">${escape(section.label)}</th>
      ${grouping.heroes.map(hero => {
        const matches = records.filter(record => record.hero === hero && grouping.groups[hero][record.name].includes(section.id))
          .sort((a,b) => a.name.localeCompare(b.name));
        return `<td data-hero-column="${escape(hero)}"><ul>${matches.map(record => {
          const note = grouping.annotations[record.name]?.[section.id];
          const focus = window.reworkFocus.has(record.name);
          return `<li data-talent="${escape(record.name)}"><span class="comparison-name${focus ? ' rework-focus' : ''}">${escape(record.name)}</span>${focus ? '<span class="sr-only"> — rework priority</span>' : ''}${note ? `<small>${escape(note)}</small>` : ''}</li>`;
        }).join('')}</ul>${matches.length ? '' : '<span class="comparison-none">—<span class="sr-only"> No talents</span></span>'}</td>`;
      }).join('')}
    </tr>`).join('');
  }

  async function initKits() {
    try {
      kits = await readJson('base-kits.json');
      select('#kit-summaries').innerHTML = kits.summaries.map(summary => `<article><h2>${escape(summary.hero)}</h2><p class="economy-name">${escape(summary.economy)}</p><p class="economy-path">${escape(summary.path)}</p><p class="small">${escape(summary.observation)}</p></article>`).join('');
      select('#kit-slot').innerHTML += kits.rows.map(row => `<option>${escape(row.slot)}</option>`).join('');
      select('#kit-sources').innerHTML = kits.sources.map(source => `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.label)}</a>`).join(' · ');
      for (const id of ['kit-slot','kit-carmilla','kit-scarlet']) select('#'+id).addEventListener('change', renderKits);
      select('#kit-reset').addEventListener('click', () => {
        select('#kit-slot').value = '';
        select('#kit-carmilla').value = select('#kit-scarlet').value = 'both';
        renderKits();
      });
      renderKits();
      select('#kit-loading').hidden = true;
      select('#kit-content').hidden = false;
    } catch (error) {
      select('#kit-loading').textContent = `The base kits could not load. Reload to retry. ${error.message}`;
    }
  }

  async function initComparison() {
    try {
      const [grouping, carmilla, otherHeroes] = await Promise.all([
        readJson('talent-groups.json'), readJson('research.json'), readJson('talent-atlas.json'),
      ]);
      const records = [...carmilla.talents.map(record => ({...record, hero:'Carmilla'})), ...otherHeroes.records];
      renderComparison(grouping, records);
      select('#atlas-loading').hidden = true;
      select('#atlas-content').hidden = false;
    } catch (error) {
      select('#atlas-loading').textContent = `The talent comparison could not load. Reload to retry. ${error.message}`;
    }
  }

  initKits();
  initComparison();
})();
