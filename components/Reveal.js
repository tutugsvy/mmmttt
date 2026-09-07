'use client';

import { useEffect, useRef } from 'react';

export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('rv--in');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('rv--in');
          io.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    // safety: never leave content permanently hidden
    const t = setTimeout(() => el.classList.add('rv--in'), 2500);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, []);

  return (
    <Tag ref={ref} className={`rv ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
