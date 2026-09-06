// HashRouter claims the URL's "#" for routing (needed for /#/admin), so
// plain <a href="#about"> anchors no longer scroll -- they try to navigate
// to a (nonexistent) route instead. Scroll programmatically, with a manual
// offset for the fixed navbar, rather than relying on the URL hash at all.
const NAV_OFFSET_PX = 100;

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET_PX;
  window.scrollTo({ top, behavior: "smooth" });
}
