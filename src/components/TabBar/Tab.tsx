import { Link } from "@tanstack/react-router";
import classNames from "classnames";
import "./Tab.css";

export default function Tab({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const className = (active?: boolean) =>
    classNames(
      "block rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-300",
      active
        ? "active-tab twogc-gradient !text-twogc-black shadow-lg ring-2 ring-blue-400"
        : "bg-transparent text-twogc-gray-300 hover:bg-[#23272f] hover:text-white"
    );

  return (
    <Link
      className={className()}
      activeProps={() => ({ className: className(true) })}
      to={to}
    >
      {/* Делаем иконку меньше */}
      <span className="flex items-center justify-center w-5 h-5">{children}</span>
    </Link>
  );
}
