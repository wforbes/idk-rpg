import type { BattleEvent, BattleState, Side } from "./types";

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
      if (e.reason === "extraDamagingCast") return `Only one damaging spell per turn — the extra ${e.spell} fizzles out.`;
      return `${e.spell} needs a whole number of mana, like ${e.spell}(4).`;
    case "notEnoughMana":
      return `Not enough mana: ${e.spell}(${e.fuel}) needs ${e.fuel} MP and you have ${e.mana}.`;
    case "fizzle":
      return `${possessive(e.who)} ${e.spell} fizzled — it needs ${e.min}–${e.max} mana, you gave it ${e.fuel}.`;
    case "cast":
      if (e.fuel !== undefined) return `${name(e.who)} cast ${e.spell} with ${e.fuel} MP!`;
      return `${name(e.who)} ${e.who === "player" ? "use" : "uses"} ${e.spell}!`;
    case "blocked":
      return `${possessive(e.who === "player" ? "enemy" : "player")} ice shield swallowed the flames!`;
    case "shieldUp":
      return `${name(e.who)} ${e.who === "player" ? "raise" : "raises"} an ice shield!`;
    case "shieldMelted":
      return `The flames melt ${foe(e.who)}'s ice shield!`;
    case "damage":
      return e.target === "player" ? `You take ${e.amount} damage.` : `${s.enemy.name} takes ${e.amount} damage.`;
    case "regen":
      return `You recover ${e.amount} MP.`;
    case "fled":
      return "You got away safely.";
    case "won":
      return `${s.enemy.name} gives up and oozes away.`;
    case "lost":
      return "You collapse…";
  }
}
