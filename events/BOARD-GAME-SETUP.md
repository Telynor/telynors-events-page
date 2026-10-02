# Multiplayer Board Game — setup

Requires **Telynor's Events Page 0.2.0 or newer**. This update preloads saved event scripts for every connected client, allowing a shared board popup to open for players who have not opened the event themselves. Refresh all connected clients after updating Events.

1. Create an event in **Event Master Settings**. Set status **Open**, layout **Custom JavaScript**, and title/artwork as desired.
2. Set the Script field to `modules/telynors-events-page/events/multiplayer-board-game.js` (bundled), or upload the separately provided `multiplayer-board-game.js` using the event designer's local script upload control.
3. Set **Plugin registration ID** to `multiplayer-board-game`. Click **Build objectives from JavaScript**; this board uses its own game state and returns an empty regular-objective list. Save the event.
4. Click **Go**. A shared board popup opens for all connected players and GMs. The page also has an **Open Shared Multiplayer Board** button. Players joining later or refreshing receive the popup for a previously opened, still-open board event. Players may close the popup locally; **Show board to everyone** reopens it across clients.
5. In the popup, click **DM Board Settings**. Drag an Item with a quantity field into the currency slot and set the roll cost. Default die: 1d6. Other die sizes from 1–100 are supported. Currency is consumed from the player's assigned character inventory.
6. Map tile labels, effects, colors and image paths. Default: 20 tiles, 5 columns, numbered snake route. Add/remove tiles in the lobby; during a game the tile count stays fixed. Configure any background path you want. Movement loops from the final tile back to Start. There is no automatic final winner or finish condition.
7. Drag Items into each tier's pool. **Amount** is copies per collection. **Stock** is the number of times that reward row can be collected by the entire group. Example: amount 5, stock 3 permits three collections of five copies each. No rewards or currency Items are fabricated by the script.
8. Assign owned currency/reward characters for players, or rely on their Events reward character / assigned Foundry user character. Save configuration. Players click **Join Game**; the joining order is the turn order. The GM clicks **Start Game**.

## Player turn

The current player presses **Roll**. The GM evaluates the die and deducts the configured currency cost. The token moves automatically. The player then clicks the tile containing their own token to activate its mapped effect. Other players watch the same board positions, pool stock, scoreboard and log. A player may not roll twice, activate another tile, or act out of turn.

| Tile effect | Resolution |
| --- | --- |
| No effect | Ends the turn. |
| Move 1 space forward | Moves one additional space. Click the newly occupied tile. A full circuit of only movement tiles ends the turn to prevent an endless loop. |
| Tier 1 Reward | Draws one randomly selected available Tier 1 reward row. |
| Tier 2 Reward | Draws one randomly selected available Tier 2 reward row. |
| Tier 3 Reward | Draws one randomly selected available Tier 3 reward row. |
| Lose 1 turn | Ends this turn and skips the player's next turn. |
| Return to Start | Moves to tile 1 and ends the turn without triggering Start's mapped effect. |
| Choose Reward Tier | Player chooses an available tier; the reward row within that tier is drawn randomly. |
| Reward of Choice | Player chooses any available reward row across all three tiers. |

Every successful collection awards **100 points**, even when its Amount is greater than one. Running out of rewards awards no points and ends the turn. A stock limit is shared across all players for that event. Different board events have separate game state and pools. Random selection is uniform across available reward rows, rather than weighted by stock.

The board does not operate on the canvas: its circular tokens are character portraits inside a shared popup. GM accounts observe, configure, start games and can **Pass Turn** if someone is disconnected or unavailable. At least one GM must remain connected; the Events module's elected GM serializes actions.

## Currency and transaction recovery

Currency matching first uses source UUID markers or the actor-owned Item UUID, then exact Item name and type to support ordinary dragged copies of world Items. Use a uniquely named dedicated Item as your currency. Split stacks are supported. Zero-quantity stacks are retained to keep recovery markers intact.

Paid rolls are saved before deduction with a fixed die result and movement destination. Each stack payment carries a marker. Rewards reserve stock before delivery and tag created Items. If an update is interrupted, press **Resume Transaction** as the affected player or GM to finish that same transaction; it does not reroll, charge a marked payment again, or create an already-marked reward again. Do not delete or manually edit payment stacks, recipient actors or reward transaction Items while a transaction is pending. If one is deleted, restore it before resuming.

The stock reservation and pending transaction are intentionally retained on a delivery failure so no other player can claim reserved stock. The GM cannot pass/reset/reconfigure until recovery finishes. This first version does not include a destructive transaction-cancellation tool. Currency changes made by unrelated modules at the same time are not covered by a server-side compare-and-swap lock; avoid simultaneous manual currency edits.

## DM adjustments

Reward inventory goes to the configured owned actor. Quantity-bearing Items are created as stacks; other Items are created as individual documents. Changing character assignment does not reset player points/positions. Editing a row's stock changes its total lifetime collection limit for the current game; remaining stock is configured stock minus collections already reserved/delivered. Use **Reset Game & Refill Stock** to start a new lobby with fresh positions, points and stock. Previously delivered inventory and spent currency stay as they are.

The regular Events progress dashboard still manages regular event objectives. This board's participant positions, stock and points live in its shared board state and are inspected/configured through the popup's DM Board Settings and scoreboard.

## Testing status

20 automated tests pass (10 Events tests and 10 board tests). Board tests cover all nine effect mappings, turn/tile restrictions, paid-roll recovery, reward recovery and stock reservation, independent player points, shared exhaustion, movement/skip/Start behavior, choices, insufficient currency, GM-only configuration, movement-loop termination, and generated popup/designer templates. This remains a beta: live Foundry multiplayer, dialog callbacks, popup hook timing and visual layout require an in-world smoke test.
