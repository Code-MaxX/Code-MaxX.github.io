/**
 * Module registry.
 *
 * Every feature mounts through here so a single failure is contained: one
 * broken enhancement must never take down the rest of the page. The content
 * is already in the DOM — nothing below this line is load-bearing.
 */

export type Module = {
  name: string;
  setup: () => void | Promise<void>;
};

export async function mountAll(modules: Module[]): Promise<void> {
  await Promise.all(
    modules.map(async (module) => {
      try {
        await module.setup();
      } catch (error: unknown) {
        console.warn(`[mount:${module.name}] failed`, error);
      }
    }),
  );
}

/** Read a CSS custom property as an rgb triple in 0–1 floats, for WebGL. */
export function cssColorToFloats(variable: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex?.[1]) {
    const value = Number.parseInt(hex[1], 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }
  const rgb = raw.match(/\d+(\.\d+)?/g);
  if (rgb && rgb.length >= 3) {
    return [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255];
  }
  return fallback;
}
