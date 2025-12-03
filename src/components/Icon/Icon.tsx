import { lazy, Suspense } from "react";
import EditIcon from './edit.svg';
import CopyIcon from './copy.svg';

export type IconName =
  | "search" | "link" | "menu" | "folder" | "backup" | "shield" | "home" | "user" | "notification" | "chevron" | "arrow" | "link2" | "terminal" | "monitor" | "server"
  | "close" | "minimize" | "maximize"
  | "plus" | "refresh" | "save" | "backup" | "folder"
  | "edit" | "copy";

const iconComponents = {
  search: lazy(() => import("./search.svg?react")),
  link: lazy(() => import("./link.svg?react")),
  menu: lazy(() => import("./menu.svg?react")),
  folder: lazy(() => import("./folder.svg?react")),
  backup: lazy(() => import("./backup.svg?react")),
  shield: lazy(() => import("./shield.svg?react")),
  home: lazy(() => import("./home.svg?react")),
  user: lazy(() => import("./user.svg?react")),
  notification: lazy(() => import("./notification.svg?react")),
  chevron: lazy(() => import("./chevron.svg?react")),
  arrow: lazy(() => import("./arrow.svg?react")),
  link2: lazy(() => import("./link-2.svg?react")),
  terminal: lazy(() => import("./terminal.svg?react")),
  monitor: lazy(() => import("./monitor.svg?react")),
  server: lazy(() => import("./home.svg?react")), // Используем home как server
  close: lazy(() => import("./close.svg?react")),
  minimize: lazy(() => import("./minimize.svg?react")),
  maximize: lazy(() => import("./maximize.svg?react")),
  plus: lazy(() => import("./plus.svg?react")),
  refresh: lazy(() => import("./refresh.svg?react")),
  save: lazy(() => import("./save.svg?react")),
};

export default function Icon({ name, ...props }: { name: IconName; [key: string]: any }) {
  if (name === 'edit') return <img src={EditIcon} alt="edit" {...props} />;
  if (name === 'copy') return <img src={CopyIcon} alt="copy" {...props} />;
  const IconComponent = iconComponents[name];
  if (!IconComponent) return null;
  return (
    <Suspense fallback={<span style={{ display: 'inline-block', width: 20, height: 20 }} />}>
      <IconComponent {...props} />
    </Suspense>
  );
}
