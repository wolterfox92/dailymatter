// @ts-check

/**
 * Horizontal step carousel with native scroll-snap, arrow + dot navigation and a
 * live "1/4" counter. Progressive enhancement: without JS the slides stay
 * scrollable and fully readable — the controls simply enhance that behaviour.
 */
class CustomStepCarousel extends HTMLElement {
  /** @type {HTMLElement | null} */
  #track = null;
  /** @type {HTMLElement[]} */
  #slides = [];
  /** @type {HTMLButtonElement[]} */
  #dots = [];
  /** @type {HTMLElement | null} */
  #counter = null;
  /** @type {HTMLButtonElement | null} */
  #prev = null;
  /** @type {HTMLButtonElement | null} */
  #next = null;
  #index = 0;
  #rafId = 0;

  connectedCallback() {
    this.#track = this.querySelector('[data-track]');
    if (!this.#track) return;

    this.#slides = /** @type {HTMLElement[]} */ (Array.from(this.querySelectorAll('[data-slide]')));
    this.#dots = /** @type {HTMLButtonElement[]} */ (Array.from(this.querySelectorAll('[data-dot]')));
    this.#counter = this.querySelector('[data-current]');
    this.#prev = this.querySelector('[data-dir="prev"]');
    this.#next = this.querySelector('[data-dir="next"]');

    this.addEventListener('click', this.#onClick);
    this.#track.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#onClick);
    this.#track?.removeEventListener('scroll', this.#onScroll);
    cancelAnimationFrame(this.#rafId);
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('[data-dir], [data-dot]');
    if (!(control instanceof HTMLElement)) return;

    if (control.dataset.dir === 'prev') this.#goTo(this.#index - 1);
    else if (control.dataset.dir === 'next') this.#goTo(this.#index + 1);
    else if (control.dataset.dot != null) this.#goTo(Number(control.dataset.dot));
  };

  #onScroll = () => {
    cancelAnimationFrame(this.#rafId);
    this.#rafId = requestAnimationFrame(() => this.#update());
  };

  /** @param {number} index */
  #goTo(index) {
    const clamped = Math.max(0, Math.min(index, this.#slides.length - 1));
    const slide = this.#slides[clamped];
    const track = this.#track;
    if (!slide || !track) return;

    const left = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /** Recompute the active slide from the track's scroll position and sync the controls. */
  #update() {
    const track = this.#track;
    if (!track) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let min = Infinity;

    for (const [i, slide] of this.#slides.entries()) {
      const distance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
      if (distance < min) {
        min = distance;
        closest = i;
      }
    }

    this.#index = closest;
    if (this.#counter) this.#counter.textContent = String(closest + 1);

    for (const [i, dot] of this.#dots.entries()) {
      const active = i === closest;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    }

    if (this.#prev) this.#prev.disabled = closest === 0;
    if (this.#next) this.#next.disabled = closest === this.#slides.length - 1;
  }
}

if (!customElements.get('custom-step-carousel')) {
  customElements.define('custom-step-carousel', CustomStepCarousel);
}
