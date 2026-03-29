import { useState, useEffect } from "react";
import Logo from "./Logo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-[#0a0a0b]/80 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display text-xl text-white">lovable-eject</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="https://github.com/ABS-Projects-2026/lovable-eject"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            GitHub
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Docs
          </a>
          <a
            href="#get-started"
            className="text-sm font-medium text-accent border border-accent/30 rounded-full px-5 py-1.5 hover:bg-accent/10 transition-colors"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-px bg-zinc-400 transition-transform duration-200 ${
              menuOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-px bg-zinc-400 transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-px bg-zinc-400 transition-transform duration-200 ${
              menuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-[#0a0a0b]/95 backdrop-blur-md px-6 py-4 flex flex-col gap-4">
          <a
            href="https://github.com/ABS-Projects-2026/lovable-eject"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            GitHub
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Docs
          </a>
          <a
            href="#get-started"
            className="text-sm font-medium text-accent"
            onClick={() => setMenuOpen(false)}
          >
            Get Started
          </a>
        </div>
      )}
    </nav>
  );
}
