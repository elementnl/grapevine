"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/debug", label: "Games" },
  { href: "/debug/new", label: "New game" },
  { href: "/debug/players", label: "Players" },
];

function isCurrent(pathname: string, href: string): boolean {
  // A game's detail page lives under Games.
  return href === "/debug"
    ? pathname === "/debug" || pathname.startsWith("/debug/games")
    : pathname.startsWith(href);
}

export function DebugNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Debug sections">
      <ul className="flex gap-1 md:flex-col">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              aria-current={
                isCurrent(pathname, section.href) ? "page" : undefined
              }
              className="btn btn-quiet w-full justify-start px-3 py-1 text-base"
              href={section.href}
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
