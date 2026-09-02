/**
 * CaseStudy — the expanded case file.
 *
 * Built on a native <dialog>: modal semantics, focus containment, Escape and
 * the top layer all come from the platform rather than from three hundred
 * lines of my own focus management.
 *
 * The card in the page is the source of truth for title, domain and stack —
 * the overlay reads them out of the DOM so the two can never drift apart.
 */

import { caseStudies } from "@/data/projects";
import { el, qs, qsa } from "@/core/dom";
import { lockScroll } from "@/core/motion";
import { scrambleTo } from "@/core/scramble";

export function initCaseStudies(): void {
  const cards = qsa<HTMLElement>(".case[data-project]");
  if (cards.length === 0) return;

  const dialog = el("dialog", { class: "study", "aria-label": "Project case study" }) as HTMLDialogElement;
  const panel = el("div", { class: "study__panel" });
  dialog.append(panel);
  document.body.append(dialog);

  let opener: HTMLElement | null = null;

  /*
   * Teardown runs here, not in a `close` listener: that event is not
   * dependable across engines, and missing it would leave the page scroll-
   * locked behind a dismissed overlay.
   */
  const close = (): void => {
    if (dialog.open) dialog.close();
    lockScroll(false);
    opener?.focus();
    opener = null;
  };

  // Belt and braces for a close this module did not initiate.
  dialog.addEventListener("close", () => lockScroll(false));

  // Click on the backdrop — i.e. on the dialog itself, outside the panel.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  // Same as the palette: own the Escape key rather than relying on the UA's
  // default cancel action, so nothing upstream can trap the reader inside.
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    close();
  });

  const open = (card: HTMLElement): void => {
    const id = card.dataset["project"];
    const sections = id ? caseStudies[id] : undefined;
    if (!sections) return;

    const code = qs(".case__id", card)?.textContent?.trim() ?? "";
    const status = qs(".case__status", card)?.textContent?.trim() ?? "";
    const title = qs(".case__open", card)?.textContent?.trim() ?? "";
    const domain = qs(".case__domain", card)?.textContent?.trim() ?? "";
    const chips = qsa(".chips li", card).map((chip) => chip.textContent?.trim() ?? "");
    const repo = qs<HTMLAnchorElement>(".case__repo", card)?.href;

    const heading = el("h2", { class: "study__title" }, [title]);
    const closeButton = el("button", { class: "study__close", type: "button" }, ["ESC ✕"]);
    closeButton.addEventListener("click", close);

    const head = el("header", { class: "study__head" }, [
      el("div", { class: "study__eyebrow" }, [
        el("span", {}, [`${code}${status ? ` · ${status}` : ""}`]),
        closeButton,
      ]),
      heading,
      el("p", { class: "study__domain" }, [domain]),
      el("ul", { class: "chips chips--sm" }, chips.map((chip) => el("li", {}, [chip]))),
    ]);

    const body = el("div", { class: "study__body" });
    for (const section of sections) {
      const content: Node[] = [el("p", { class: "study__text" }, [section.body])];
      if (section.items) {
        content.push(
          el("ul", { class: "study__list" }, section.items.map((item) => el("li", {}, [item]))),
        );
      }
      body.append(
        el("section", { class: "study__section" }, [
          el("h3", { class: "study__heading" }, [section.heading]),
          el("div", { class: "study__content" }, content),
        ]),
      );
    }

    if (repo) {
      body.append(
        el("div", { class: "study__foot" }, [
          el(
            "a",
            { class: "btn btn--ghost", href: repo, target: "_blank", rel: "noopener", "data-cursor": "link" },
            [el("span", {}, ["OPEN REPOSITORY"]), el("span", { "aria-hidden": "true" }, ["↗"])],
          ),
        ]),
      );
    }

    panel.replaceChildren(head, body);
    opener = qs(".case__open", card);

    dialog.showModal();
    lockScroll(true);
    closeButton.focus();
    scrambleTo(heading, title, { speed: 0.6, stagger: 0.5 });
  };

  for (const card of cards) {
    const trigger = qs("button.case__open", card);
    trigger?.addEventListener("click", () => open(card));
  }
}
