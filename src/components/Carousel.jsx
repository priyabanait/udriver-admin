import React, { useEffect, useState, useRef } from 'react';

export default function Carousel({ interval = 4000 }) {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sliders/public`);
        if (!res.ok) return;
        const data = await res.json();
        setSlides(data);
      } catch (err) {
        console.warn('Failed to fetch public sliders', err);
      }
    };
    fetchSlides();
  }, []);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    timer.current = setInterval(() => {
      setIndex(i => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer.current);
  }, [slides, interval]);

  if (!slides || slides.length === 0) return null;

  const current = slides[index];

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <img src={current.imageUrl} alt={`carousel-${current._id}`} className="w-full h-64 object-cover" />
      <div className="absolute right-2 bottom-2 flex space-x-2">
        {slides.map((s, i) => (
          <button key={s._id} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i===index ? 'bg-white' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
}
