// Symbol configuration consumed by the template.
// Map either sheet IDs or chapter titles (data-toc text) to symbol lists.
// Use the same "Sym: Beschreibung; ..." format as data-symbols.
window.SymbolSettings = {
  // Example: target by sheet id (auto-assigned as sheet-1, sheet-2, ...)
  byId: {
    // "sheet-3": "p: Druck; V: Volumen; T: Temperatur; n: Stoffmenge",
  },
  // Example: target by chapter title (data-toc value)
  byTitle: {
    // "Kapitel 1": "F: Kraft; m: Masse; a: Beschleunigung",
  },
  // Fallback if neither data-symbols nor specific mapping is provided.
  defaultSymbols: "",

  // Global definitions: define each symbol once, and the template will
  // show it automatically on sheets where the symbol is used in math.
  // Keys are raw symbols (without backslash); values are descriptions.
  globalDefinitions: {
    // F: "Kraft",
    // m: "Masse",
    // a: "Beschleunigung",
    // p: "Druck",
    // V: "Volumen",
    // T: "Temperatur",
    // n: "Stoffmenge",
  },
};
