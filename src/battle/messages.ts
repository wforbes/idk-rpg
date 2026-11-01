import { ITEMS } from "../data/items";
import type { BattleEvent, BattleState, Resource, Side } from "./types";

const unit = (r: Resource) => (r === "mana" ? "MP" : "EN");
const itemName = (id: string) => ITEMS[id]?.name ?? id;

/** One line of battle narration per event. Short, a little playful, explicit about the rule. */
export function describeEvent(e: BattleEvent, s: BattleState): string {
  const name = (side: Side) => (side === "player" ? "You" : s.enemy.name);
  const possessive = (side: Side) => (side === "player" ? "Your" : `${s.enemy.name}'s`);
  const foe = (side: Side) => (side === "player" ? s.enemy.name : "you");

  switch (e.type) {
    case "worldChanged":
      return `The air shifts. It's ${e.temperature}° now.`;
    case "codeError":
      return e.who === "player" ? `Your spell fell apart! ${e.message}` : `${s.enemy.name} trips over its own code.`;
    case "noAction":
      return e.who === "player" ? "You hesitate… your code didn't cast anything." : `${s.enemy.name} just wobbles.`;
    case "rejected":
      if (e.reason === "unknownSpell") return `${name(e.who)} don't know a spell called ${e.spell}.`;
      if (e.reason === "extraAction") return `Only one move, spell or taunt per turn — the extra ${e.spell} fizzles out.`;
      return `${e.spell} needs a whole number of fuel, like ${e.spell}(4).`;
    case "notEnoughFuel":
      return `Not enough ${e.resource}: ${e.spell}(${e.fuel}) needs ${e.fuel} ${unit(e.resource)} and you have ${e.have}.`;
    case "fizzle":
      return `${possessive(e.who)} ${e.spell} fizzled — it needs ${e.min}–${e.max} ${e.resource}, you gave it ${e.fuel}.`;
    case "cast":
      if (e.fuel !== undefined) return `${name(e.who)} ${e.resource === "energy" ? "use" : "cast"} ${e.spell} with ${e.fuel} ${unit(e.resource ?? "mana")}!`;
      return `${name(e.who)} ${e.who === "player" ? "use" : "uses"} ${e.spell}!`;
    case "blocked":
      if (e.spell === "jab") return `${possessive(e.who)} jab bounces off ${foe(e.who)}'s ice shield!`;
      return `${possessive(e.who === "player" ? "enemy" : "player")} ice shield swallowed the flames!`;
    case "missed":
      return `${possessive(e.who)} ${e.spell} misses — ${e.who === "player" ? s.enemy.name : "you"} ${e.who === "player" ? "isn't" : "aren't"} there!`;
    case "shieldUp":
      return `${name(e.who)} ${e.who === "player" ? "raise" : "raises"} an ice shield!`;
    case "shieldMelted":
      return `The flames melt ${foe(e.who)}'s ice shield!`;
    case "damage":
      return e.target === "player" ? `You take ${e.amount} damage.` : `${s.enemy.name} takes ${e.amount} damage.`;
    case "regen":
      return `You recover ${e.amount} ${unit(e.resource)}.`;
    case "itemUsed":
      return `${name(e.who)} use the ${itemName(e.item)}!`;
    case "itemRejected":
      return e.reason === "extraItem"
        ? `Only one item per turn — the ${itemName(e.item)} stays in your bag.`
        : `You don't have a ${itemName(e.item)}.`;
    case "temperatureRaised":
      return `The air warms up. It's ${e.temperature}° now.`;
    case "restored":
      return `${name(e.who)} recover ${e.amount} ${unit(e.resource)}.`;
    case "log":
      return `console.log: ${e.text}`;
    case "fled":
      return "You got away safely.";
    case "won":
      return `${s.enemy.name} gives up and oozes away.`;
    case "lost":
      return "You collapse…";
  }
}
