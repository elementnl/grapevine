import Link from "next/link";
import type { ReactNode } from "react";

import { APP_NAME } from "@/constants/app";

type TopBarProps = {
  // The debug player switcher, when debug tools are on.
  middle?: ReactNode;
  links: Array<{ href: string; label: string }>;
};

export function TopBar({ middle, links }: TopBarProps) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <Link
        className="font-hand text-2xl font-bold text-grape hover:text-grape-strong"
        href="/"
      >
        {APP_NAME}
      </Link>
      {middle}
      <div className="flex gap-1">
        {links.map((link) => (
          <Link
            className="btn btn-quiet px-3 py-1 text-base"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
