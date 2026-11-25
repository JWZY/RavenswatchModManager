import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:1423';
let server;
let browser;
let context;
let page;
before(async () => {
  server = spawn(
    process.execPath,
    [
      new URL('../../bin/vite.js', import.meta.resolve('vite')).pathname,
      '--host',
      '127.0.0.1',
      '--port',
      '1423',
    ],
    {
      stdio: 'pipe',
    },
  );
  let log = '';
  server.stdout.on('data', (data) => {
    log += data;
  });
  server.stderr.on('data', (data) => {
    log += data;
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      await fetch(`${base}/e2e/dialogs.html`)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    if (server.exitCode !== null) throw new Error(log);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (attempt === 99) throw new Error(log);
  }
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});
after(async () => {
  await browser?.close();
  server?.kill('SIGTERM');
});
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // No fixture action can send data to a live service.
  await context.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', (error) => console.error(error.message));
  await page.goto(`${base}/e2e/dialogs.html`);
  await page.getByRole('button', { name: 'Delete sample', exact: true }).waitFor();
});
afterEach(async () => {
  await context?.close();
});
async function modal(name) {
  const node = page.getByRole('dialog', { name, exact: true });
  await node.waitFor();
  assert.equal(await node.evaluate((n) => n.matches(':modal')), true);
  return node;
}
async function focused(name) {
  await page.waitForFunction(
    (name) =>
      document.activeElement?.textContent?.trim() === name ||
      document.activeElement?.getAttribute('aria-label') === name,
    name,
  );
}
async function cycle(node) {
  for (const key of [
    'Tab',
    'Tab',
    'Tab',
    'Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
  ]) {
    await page.keyboard.press(key);
    assert.equal(
      await node.evaluate((n) => n.contains(document.activeElement)),
      true,
      `focus escaped with ${key}`,
    );
  }
}

test('destructive confirmation focuses Cancel; Enter cancels, never confirms', async () => {
  await page.getByRole('button', { name: 'Delete sample', exact: true }).click();
  const node = await modal('Delete sample?');
  await focused('Cancel');
  await cycle(node);
  await node.getByRole('button', { name: 'Cancel' }).focus();
  await page.keyboard.press('Enter');
  await node.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('status', { name: 'Result' }).textContent(), 'false');
  await focused('Delete sample');
});

test('Escape restores focus and scrolling; background controls cannot take focus', async () => {
  await page.evaluate(() => {
    document.body.style.overflow = 'scroll';
    document.documentElement.style.overflow = 'auto';
  });
  await page.getByRole('button', { name: 'Delete sample', exact: true }).click();
  const node = await modal('Delete sample?');
  await page
    .getByRole('button', { name: 'Rename sample', exact: true, includeHidden: true })
    .evaluate((n) => n.focus());
  assert.equal(await node.evaluate((n) => n.contains(document.activeElement)), true);
  assert.deepEqual(
    await page.evaluate(() => [
      document.body.style.overflow,
      document.documentElement.style.overflow,
    ]),
    ['hidden', 'hidden'],
  );
  await page.keyboard.press('Escape');
  await node.waitFor({ state: 'detached' });
  await focused('Delete sample');
  assert.deepEqual(
    await page.evaluate(() => [
      document.body.style.overflow,
      document.documentElement.style.overflow,
    ]),
    ['scroll', 'auto'],
  );
});

test('prompts select initial text, ignore IME Enter, and submit single-line input', async () => {
  await page.getByRole('button', { name: 'Rename sample', exact: true }).click();
  const node = await modal('Rename sample');
  const field = node.getByRole('textbox', { name: 'Name' });
  assert.equal(
    await field.evaluate((n) => n === document.activeElement && n.selectionEnd === n.value.length),
    true,
  );
  await field.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  assert.equal(await node.count(), 1);
  await field.fill('Raven renamed');
  await field.press('Enter');
  await node.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('status', { name: 'Result' }).textContent(), '"Raven renamed"');
});

test('multiline Enter inserts a newline; Cancel returns null', async () => {
  await page.getByRole('button', { name: 'Edit notes', exact: true }).click();
  const node = await modal('Edit notes');
  const field = node.getByRole('textbox', { name: 'Notes' });
  await field.fill('First');
  await field.press('End');
  await field.press('Enter');
  await field.press('b');
  assert.equal(await field.inputValue(), 'First\nb');
  await node.getByRole('button', { name: 'Cancel' }).press('Enter');
  await node.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('status', { name: 'Result' }).textContent(), 'null');
});

test('nested dialogs keep the parent inert and locked until the child closes', async () => {
  await page.getByRole('button', { name: 'Open parent', exact: true }).click();
  await modal('Parent');
  await page.getByRole('button', { name: 'Open child', exact: true }).click();
  const child = await modal('Child');
  await cycle(child);
  await page.keyboard.press('Escape');
  await child.waitFor({ state: 'detached' });
  await focused('Open child');
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await focused('Open parent');
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
});

test('out-of-order dialog teardown does not unlock or steal focus from the child', async () => {
  await page.getByRole('button', { name: 'Open parent', exact: true }).click();
  await modal('Parent');
  await page.getByRole('button', { name: 'Open child', exact: true }).click();
  const child = await modal('Child');
  await child.getByRole('button', { name: 'Unmount parent first' }).click();
  assert.equal(await child.evaluate((n) => n.contains(document.activeElement)), true);
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await page.keyboard.press('Escape');
  await child.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
});

for (const [trigger, title] of [
  ['Open filters', 'Filters'],
  ['Open launch options', 'Steam launch options needed'],
  ['Open image', 'Sample image'],
]) {
  test(`${trigger} uses the shared focus and Escape contract`, async () => {
    await page.getByRole('button', { name: trigger, exact: true }).click();
    const node = await modal(title);
    await cycle(node);
    await page.keyboard.press('Escape');
    await node.waitFor({ state: 'detached' });
    await focused(trigger);
  });
}

test('required disclosure contains focus and cannot be dismissed with Escape', async () => {
  await page.getByRole('button', { name: 'Open disclosure' }).click();
  const node = await modal('How this project was built');
  await cycle(node);
  await page.keyboard.press('Escape');
  assert.equal(await node.isVisible(), true);
  await node.getByRole('button', { name: 'Understood' }).click();
  await node.waitFor({ state: 'detached' });
  await focused('Open disclosure');
});

test('long translated confirmation remains scrollable at a narrow viewport and 150% text', async () => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await page.getByRole('button', { name: 'Long confirmation', exact: true }).click();
  const node = await modal('Long confirmation');
  const card = node.locator('.grimoire-card');
  assert.equal(await card.evaluate((n) => n.scrollHeight > n.clientHeight), true);
  await node.getByRole('button', { name: 'Cancel' }).focus();
  const rect = await node.getByRole('button', { name: 'Cancel' }).boundingBox();
  assert.ok(rect.y >= 0 && rect.y + rect.height <= 500);
  await page.keyboard.press('Enter');
  await node.waitFor({ state: 'detached' });
});

test('web report contains focus, preserves field edits, and returns focus on Escape', async () => {
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  const node = await modal('Report this mod');
  await cycle(node);
  await node.getByRole('textbox', { name: 'Details (optional)' }).fill('Local test only');
  await page.keyboard.press('Escape');
  await node.waitFor({ state: 'detached' });
  await focused('Report');
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await modal('Report this mod');
  assert.equal(
    await page.getByRole('textbox', { name: 'Details (optional)' }).inputValue(),
    'Local test only',
  );
});

test('real Library uninstall cannot be confirmed by pressing Enter on Cancel', async () => {
  await page.goto(`${base}/?preview=library`);
  const trigger = page.getByRole('button', { name: 'Uninstall Raven’s Toolkit', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const node = await modal('Uninstall Raven’s Toolkit?');
  await focused('Cancel');
  await cycle(node);
  await page.keyboard.press('Control+k');
  assert.equal(await page.getByRole('dialog').count(), 1);
  await node.getByRole('button', { name: 'Cancel' }).press('Enter');
  await node.waitFor({ state: 'detached' });
  await trigger.waitFor();
  assert.equal(await trigger.evaluate((n) => n === document.activeElement), true);
});
