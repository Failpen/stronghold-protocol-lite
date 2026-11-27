const RE = /规程[·・.\s]*序列|序列\s*[ⅠI1]/;
const SEL = 'span,div,p,em,b,strong,h1,h2,h3,small,button,li';
function scrub() {
  for (const el of document.querySelectorAll(SEL)) {
    if (el.dataset.spScrubbed) continue;
    if (el.children.length > 2) continue;
    const text = (el.textContent || '').trim();
    if (text && text.length < 24 && RE.test(text)) {
      el.dataset.spScrubbed = '1';
      el.style.display = 'none';
    }
  }
}
export function initScrubVersionTag() {
  scrub();
  new MutationObserver(scrub).observe(document.body, { childList: true, subtree: true });
  setInterval(scrub, 1500);
}
