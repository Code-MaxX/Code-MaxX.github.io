const nav = document.querySelector(".nav");
const toggle = document.getElementById("nav-toggle");
const links = document.getElementById("nav-links");
const year = document.getElementById("year");

if (year) year.textContent = String(new Date().getFullYear());

const onScroll = () => {
  nav?.classList.toggle("is-scrolled", window.scrollY > 12);
};

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

toggle?.addEventListener("click", () => {
  const open = links?.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});

links?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    links.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});
