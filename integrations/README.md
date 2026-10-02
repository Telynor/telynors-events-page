# Planar drop integration

`planar.mjs` is a narrowly patched copy of **Tely's Planar Ornaments 1.0.5**'s `scripts/planar.mjs`. It adds a call to the Events drop API in the existing GM generation transaction. It does not change equipped ornaments, progression, stats or inventory already present.

Install Events first. Stop/reload your world, back up `Data/modules/telys-planar-ornaments/scripts/planar.mjs`, then replace that file with the one here. Use this patch **only with Planar Ornaments 1.0.5**. This is not a complete second module and should not be enabled separately. Future Planar updates may overwrite it. If your installed version differs, retain that version and port the three-line call below into its corresponding generation transaction instead.

When Events is disabled, generation behaves normally. With Events enabled, newly generated entries are multiplied before committing the shared collection. A character with exactly one owning player identifies that beneficiary; shared characters/no selected character do not guess a beneficiary, so player-restricted bonuses need an explicit User ID from your custom loot integration. Global events still apply.

```js
const eventDrops = window.TelyEvents?.modifyPlanarDrops
  ? await window.TelyEvents.modifyPlanarDrops([baseDrop], {
      userId: beneficiaryUserId,
      reroll: () => generate(set, slot, config)
    })
  : [baseDrop];
await game.settings.set(ID, 'relics', [...storedRelics(), ...eventDrops]);
```
