import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollTriggerOptions {
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale-up';
  duration?: number;
  delay?: number;
  stagger?: number;
  y?: number;
  x?: number;
  start?: string;
  childSelector?: string;
}

export function useScrollTrigger<T extends HTMLElement>(options: ScrollTriggerOptions = {}) {
  const ref = useRef<T>(null);

  const {
    animation = 'fade-up',
    duration = 0.8,
    delay = 0,
    stagger = 0.1,
    y = 40,
    x = 60,
    start = 'top 80%',
    childSelector,
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const targets = childSelector ? element.querySelectorAll(childSelector) : element;

    const fromVars: gsap.TweenVars = {
      opacity: 0,
    };

    const toVars: gsap.TweenVars = {
      opacity: 1,
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        once: true,
      },
    };

    switch (animation) {
      case 'fade-up':
        fromVars.y = y;
        toVars.y = 0;
        break;
      case 'fade-in':
        break;
      case 'slide-left':
        fromVars.x = -x;
        toVars.x = 0;
        break;
      case 'slide-right':
        fromVars.x = x;
        toVars.x = 0;
        break;
      case 'scale-up':
        fromVars.scale = 0.95;
        toVars.scale = 1;
        break;
    }

    if (childSelector && (targets as NodeListOf<Element>).length > 1) {
      toVars.stagger = stagger;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(targets, fromVars, toVars);
    }, element);

    return () => ctx.revert();
  }, [animation, duration, delay, stagger, y, x, start, childSelector]);

  return ref;
}
