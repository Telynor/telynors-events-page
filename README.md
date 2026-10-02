# Telynor's Events Page — 0.2.0 beta

Targets Foundry VTT 14 and D&D 5e 5.3.3. Built against the supplied Ultimates 3.13.18 and Planar Ornaments 1.0.5 packages. This is a first beta: automated logic and template-generation checks pass; a running Foundry world and browser layout verification were not available.

## Install

1. Copy the `telynors-events-page` folder into Foundry's `Data/modules/` directory. Restart Foundry and enable **Telynor's Events Page** in your world.
2. Enable **Tely's Star Rail Ultimates** to get both entry points: an Events phone tile and an Events control inside the existing HSR left rail. The phone designer also offers **Events** as a configurable tile action. A fallback tile appears below existing tiles when none is configured.
3. Open **Settings → Configure Settings → Telynor's Events Page → Event Master Settings**. The same master opens from the event browser for GMs. No events or game rewards are created until you configure them.
4. For actual planar drop multiplication, follow `integrations/README.md`. Events itself needs no changes to Ultimates.

Macro to open the browser: `TelyEvents.open()`.

## Designer and browser

Create as many events and objectives as needed; no programmed count limit. World-setting size, artwork memory and list rendering still impose practical limits. Higher numeric priorities appear first; ties sort by title then ID. Events may be draft, open or archived, optionally scheduled with ISO timestamps such as `2026-10-10T20:00:00-04:00`.

Customize title, description, information-button text, list thumbnail, browser background, separate event-page background, foreground character art, reward-frame art, accent, text color, darkening, artwork/panel positions and widths, page columns, eligible players and objective order/prerequisites. Browse or enter Foundry-relative image paths. Drag art and the detail panel in the preview; numeric positions are percentages. Backgrounds cover the page. A transparent frame image is recommended for reward cards. Click **Go** at the lower right of the browser detail panel to open the selected event's full page and load its script. Information opens a separate readable window.

The Gift of Odyssey preset creates seven days in the 3+3+1 layout, with a tall final day. Drop your ticket/reward Item onto each day; preset suggested quantities are 1, 1, 2, 1, 1, 1, 3. No copyrighted character artwork or reward items are bundled. Supply your own art and Items. Check-ins count days the player presses Daily Check-In; missing a day never resets their accumulated count. Default daily reset is 04:00 America/New_York, configurable per event. Server/GM time is used. Logging into Foundry alone does not count as a check-in. Rewards become claimable after the day's check-in.

## Rewards and progress

Each Foundry User has separate event/objective/check-in progress. Changing character does not change that progress. The master shows online and offline players. Choose an owned reward actor for each player, or use their assigned user character. Set objective counts, award a single objective to one player, or select players and award all their completed, unclaimed objectives. Bulk awards skip incomplete objectives and report individual failures.

Drag world/compendium Items onto an objective and set each quantity, or enter an Item UUID. Quantity-bearing Items are created as a stack; non-quantity Items are created individually. Reward rows allow 1–10,000 copies. Reward source Items must still resolve when claimed. Event rewards do not merge into unrelated existing stacks; delivered Items carry a recovery marker.

Reward delivery is GM-mediated. A persistent award ledger and Item markers prevent a repeated click or recovery after creation from creating the same reward twice. Once delivery starts, that award's source data and destination actor are fixed. Editing rewards later affects future awards, not a partially delivered award. Editing progress never unclaims a delivered reward. Deleting an event removes its current progress; delivery records and inventory rewards remain. Event duplication starts with fresh progress. Check-in edits recompute the number of contiguous completed days.

An active GM is needed. With multiple active GMs, the one whose User ID sorts first is the event writer and handles requests; use that GM's master for changes. This prevents simultaneous GM writes to the same database. Player requests use the requesting User's own server-permission-checked flag rather than trusting a submitted user ID. World event/progress settings are synchronized to clients; this version does not provide secret per-player objective data.

## JavaScript events

Each event may point to a `.js`/`.mjs` file already uploaded to Foundry, or the GM may upload a local file into the current world's directory in the designer. Set the world-relative Script path and registration ID. Click **Build objectives from JavaScript** to populate its objective list, then configure rewards normally. Building replaces the draft's objective list, so keep IDs stable on later revisions.

Scripts are trusted code with Foundry access, not sandboxed code or automatically interpreted prose. They execute when the designer builds or the event page opens, with an action handler on the elected GM when a player clicks a plugin action. Do not award items directly in a render method: it may execute repeatedly. Use the built-in reward/claim system. Browser ES module imports cache by URL; use a new filename for a revised script and update the path. Relative paths only; external code URLs are rejected.

Example registration:

```js
TelyEvents.register('my-hunt', {
  build: () => [
    {id:'first-clue',title:'Find a clue',target:1,rewards:[]},
    {id:'treasure',title:'Discover the treasure',target:1,requires:['first-clue'],rewards:[]}
  ],
  render: ({root,event,progress,action}) => {
    const button=document.createElement('button');
    button.textContent='Inspect the vault';
    button.onclick=()=>action('inspect-vault',{});
    root.append(button);
  },
  action: async ({action,user,event,progress,data,context}) => {
    if(action==='inspect-vault') {
      // Validate an actual world condition here. Client data is not proof.
      if(!game.actors.get(user.character?.id)?.getFlag('my-world','vaultOpened'))
        throw Error('The vault is still closed.');
      context.setProgress('first-clue',1);
    }
  },
  mount: ({root}) => {
    // Install extra listeners/timers if needed; return a cleanup function.
    return () => {};
  }
});
```

Set plugin registration ID to `my-hunt`. An ES module may instead `export default` the definition, with the event ID as the default registration ID. `render` and `mount` receive the plugin root, event, current player's progress, user, `action(name,payload)` and `refresh()`. `renderItem({...context, root, item, itemProgress})` may customize each objective card separately. `action` receives a GM-side `context.setProgress(itemId,value)` and validates prerequisites. Plugins can implement complex minigames, scavenger hunts or custom UI per objective. The module also exposes GM-only `TelyEvents.setProgress(eventId,userId,itemId,value)` for world macros/integrations. Bundled `events/scavenger-hunt.js` is an example requiring GM confirmation of discoveries.

## Planar bonus behavior

Set a currently open event's planar multiplier to 3 for triple drops. Eligible-player restrictions and event start/end times apply; multiple bonuses use the highest multiplier, not multiplication. The optional integration makes both ordinary and custom planar generation produce the multiplied number of entries in the shared collection. Random generation rolls additional drops independently. Custom generation repeats your selected custom configuration. It also affects manual generation while the bonus is active: set the event's multiplier back to 1 or close/archive it to stop the bonus.

For a custom loot system, call `await TelyEvents.modifyPlanarDrops(baseEntries, {userId, reroll})` on the GM **before** writing that loot batch. Pass the actual beneficiary User ID for per-player eligibility. `reroll(baseEntry)` optionally returns a fresh relic object for extra copies. The returned entries have distinct IDs. Without an integration calling this API, other modules' loot is not silently multiplied.

## Validation

The repository includes source and 20 automated tests. Tests cover priority order, separate check-ins, DST/reset boundaries, active/eligible drop bonuses, invalid prerequisites, skipped incomplete awards, reward recovery after simulated disconnection, repeated check-ins, unique extra drops and player write rejection. Syntax checks pass for all module and example files. Template output was generated for the browser, check-in page, designer and master. Live Foundry permissions, hook order, FilePicker uploads, phone positioning and responsive layouts still need an in-world smoke test.

## Foundry manifest

Install using `https://raw.githubusercontent.com/Telynor/telynors-events-page/main/manifest.json` after the repository and release have been published.

## Multiplayer board game

Bundled uploadable plugin: `events/multiplayer-board-game.js`. Set plugin registration ID to `multiplayer-board-game`. Full setup and rules: [BOARD-GAME-SETUP.md](events/BOARD-GAME-SETUP.md). Version 0.2.0 preloads event scripts on connected clients and gives plugin actions a stable request ID for transaction recovery.
