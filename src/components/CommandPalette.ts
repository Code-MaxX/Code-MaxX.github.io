/**
 * CommandPalette — ⌘K / Ctrl-K.
 *
 * Navigation, external channels and a small set of introspection commands.
 * Built on <dialog> for real modal semantics, driven entirely from the
 * keyboard, and wired to the same scroll routine the nav links use so there
 * is one way to move around the page.
 */

import { systemFacts } from "@/data/profile";
import { el, on, trapFocus } from "@/core/dom";
import { lockScroll, scrollToSection } from "@/core/motion";

type Command = {
  id: string;
  label: string;
  group: "Navigate" | "Channels" | "System";
  glyph: string;
  hint: string;
  keywords?: string[];
  run: (io: Output) => void;
};

type Output = {
  print: (lines: string[], tone?: "ok" | "warn") => void;
  clear: () => void;
  close: () => void;
};

const goto = (id: string) => (io: Output): void => {
  io.close();
  scrollToSection(id);
};

const openUrl = (url: string) => (io: Output): void => {
  io.close();
  window.open(url, "_blank", "noopener,noreferrer");
};

const COMMANDS: Command[] = [
  { id: "overview", label: "Overview", group: "Navigate", glyph: "01", hint: "Section", keywords: ["about", "profile", "engineer"], run: goto("overview") },
  { id: "experience", label: "Experience", group: "Navigate", glyph: "02", hint: "Section", keywords: ["work", "urbanpiper", "apperture", "cogoport", "roles"], run: goto("experience") },
  { id: "architecture", label: "Architecture — Periscope", group: "Navigate", glyph: "◇", hint: "Diagram", keywords: ["diagram", "system", "periscope", "clickhouse", "arq"], run: goto("role-urbanpiper") },
  { id: "stack", label: "Stack", group: "Navigate", glyph: "03", hint: "Section", keywords: ["tech", "systems map", "python"], run: goto("stack") },
  { id: "projects", label: "Projects", group: "Navigate", glyph: "04", hint: "Section", keywords: ["case files", "work"], run: goto("projects") },
  { id: "research", label: "Research", group: "Navigate", glyph: "05", hint: "Section", keywords: ["publication", "iciccs", "paper"], run: goto("research") },
  { id: "contact", label: "Contact", group: "Navigate", glyph: "06", hint: "Section", keywords: ["email", "hire", "connect"], run: goto("contact") },

  { id: "github", label: "GitHub — Code-MaxX", group: "Channels", glyph: "↗", hint: "External", run: openUrl("https://github.com/Code-MaxX") },
  { id: "linkedin", label: "LinkedIn — in/sahil-ghule", group: "Channels", glyph: "↗", hint: "External", run: openUrl("https://www.linkedin.com/in/sahil-ghule") },
  { id: "resume", label: "Resume — PDF", group: "Channels", glyph: "↓", hint: "Download", keywords: ["cv"], run: openUrl("/Sahil_Ghule_Resume.pdf") },
  {
    id: "email", label: "Email — work.sahilghule@gmail.com", group: "Channels", glyph: "@", hint: "Compose",
    run: (io) => { io.close(); window.location.href = "mailto:work.sahilghule@gmail.com"; },
  },

  { id: "whoami", label: "whoami", group: "System", glyph: "$", hint: "Print", run: (io) => io.print([...systemFacts.whoami]) },
  { id: "stackinfo", label: "stack", group: "System", glyph: "$", hint: "Print", keywords: ["technologies"], run: (io) => io.print([...systemFacts.stack]) },
  { id: "uptime", label: "uptime", group: "System", glyph: "$", hint: "Print", keywords: ["years", "experience"], run: (io) => io.print([...systemFacts.uptime]) },
  {
    id: "hire", label: "sudo hire sahil", group: "System", glyph: "#", hint: "Elevated",
    keywords: ["sudo", "root", "job", "offer"],
    run: (io) => {
      io.print(["ACCESS GRANTED ✓", "Opening contact channel…"], "ok");
      window.setTimeout(() => {
        io.close();
        scrollToSection("contact");
        window.setTimeout(() => { window.location.href = "mailto:work.sahilghule@gmail.com"; }, 700);
      }, 900);
    },
  },
  {
    id: "sudo", label: "sudo", group: "System", glyph: "#", hint: "Elevated",
    run: (io) => io.print(["sahil is not in the sudoers file.", "This incident has been logged. ¯\\_(ツ)_/¯"], "warn"),
  },
  {
    id: "help", label: "help", group: "System", glyph: "?", hint: "Print",
    keywords: ["commands", "?"],
    run: (io) => io.print([
      "↑ ↓   move        ⏎  run        esc  close",
      "try   whoami · stack · uptime · sudo hire sahil",
      "hint  the konami code turns on telemetry",
    ]),
  },
];

/** Subsequence match with a bonus for prefix hits — enough for 18 commands. */
function score(query: string, command: Command): number {
  if (!query) return 1;
  const haystack = `${command.label} ${command.id} ${command.keywords?.join(" ") ?? ""}`.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (haystack.startsWith(needle)) return 1000;

  const direct = haystack.indexOf(needle);
  if (direct >= 0) return 500 - direct;

  let index = 0;
  let hits = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, index);
    if (found < 0) return 0;
    hits += found === index ? 2 : 1;
    index = found + 1;
  }
  return hits;
}

export type PaletteApi = { open: (prefill?: string) => void };

let api: PaletteApi | null = null;

/** Other modules (the easter eggs, mainly) drive the palette through this. */
export const getPalette = (): PaletteApi | null => api;

export function initCommandPalette(): void {
  const dialog = el("dialog", { class: "palette", "aria-label": "Command palette" }) as HTMLDialogElement;

  const input = el("input", {
    class: "palette__input",
    type: "text",
    role: "combobox",
    "aria-expanded": "true",
    "aria-controls": "palette-list",
    "aria-autocomplete": "list",
    placeholder: "Type a command or section…",
    autocomplete: "off",
    spellcheck: false,
  }) as HTMLInputElement;

  const list = el("div", { class: "palette__list", id: "palette-list", role: "listbox", "aria-label": "Commands" });
  const out = el("pre", { class: "palette__out", "aria-live": "polite" });

  const panel = el("div", { class: "palette__panel" }, [
    el("div", { class: "palette__field" }, [el("span", { class: "palette__prompt" }, ["›"]), input]),
    list,
    out,
    el("div", { class: "palette__foot" }, [
      el("span", {}, ["↑↓ navigate"]),
      el("span", {}, ["⏎ run"]),
      el("span", {}, ["esc close"]),
      el("span", {}, ["type ? for help"]),
    ]),
  ]);

  dialog.append(panel);
  document.body.append(dialog);

  let matches: Command[] = COMMANDS;
  let active = 0;

  const io: Output = {
    print: (lines, tone) => {
      out.replaceChildren();
      for (const line of lines) {
        const span = el("span", tone ? { class: tone } : {}, [line]);
        out.append(span, document.createTextNode("\n"));
      }
    },
    clear: () => out.replaceChildren(),
    close: () => dialog.close(),
  };

  const draw = (): void => {
    list.replaceChildren();
    if (matches.length === 0) {
      list.append(el("p", { class: "palette__empty" }, ["No matching command"]));
      return;
    }

    let group = "";
    matches.forEach((command, index) => {
      if (command.group !== group) {
        group = command.group;
        list.append(el("p", { class: "palette__group" }, [group]));
      }
      const item = el("button", {
        class: "palette__item",
        type: "button",
        role: "option",
        id: `palette-item-${command.id}`,
        "aria-selected": index === active ? "true" : "false",
      }, [
        el("span", { class: "palette__glyph" }, [command.glyph]),
        el("span", { class: "palette__label" }, [command.label]),
        el("span", { class: "palette__hint" }, [command.hint]),
      ]);
      item.addEventListener("click", () => command.run(io));
      item.addEventListener("pointerenter", () => {
        active = index;
        syncSelection();
      });
      list.append(item);
    });
    syncSelection();
  };

  const syncSelection = (): void => {
    const items = list.querySelectorAll<HTMLElement>(".palette__item");
    items.forEach((item, index) => {
      item.setAttribute("aria-selected", index === active ? "true" : "false");
    });
    const current = matches[active];
    if (current) input.setAttribute("aria-activedescendant", `palette-item-${current.id}`);
    items[active]?.scrollIntoView({ block: "nearest" });
  };

  const filter = (): void => {
    const query = input.value.trim();
    if (!query) {
      // No query: keep declaration order so the groups stay contiguous.
      matches = COMMANDS;
    } else {
      matches = COMMANDS.map((command) => ({ command, value: score(query, command) }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value || a.command.label.localeCompare(b.command.label))
        .map((entry) => entry.command);
    }
    active = 0;
    draw();
  };

  input.addEventListener("input", () => {
    // `?` is the fastest possible route to "what can I type here".
    if (input.value === "?") {
      input.value = "help";
    }
    filter();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      active = matches.length ? (active + 1) % matches.length : 0;
      syncSelection();
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      active = matches.length ? (active - 1 + matches.length) % matches.length : 0;
      syncSelection();
    } else if (event.key === "Enter") {
      event.preventDefault();
      matches[active]?.run(io);
    } else if (event.key === "Home") {
      active = 0;
      syncSelection();
    } else if (event.key === "End") {
      active = Math.max(0, matches.length - 1);
      syncSelection();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") trapFocus(panel, event);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => lockScroll(false));

  const open = (prefill?: string): void => {
    if (dialog.open) return;
    input.value = prefill ?? "";
    io.clear();
    filter();
    dialog.showModal();
    lockScroll(true);
    input.focus();
    input.select();
  };

  on(document, "keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  });

  for (const trigger of document.querySelectorAll<HTMLElement>("[data-open-palette]")) {
    trigger.addEventListener("click", () => open());
  }

  api = { open };
  filter();
}
