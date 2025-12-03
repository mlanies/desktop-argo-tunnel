import Icon from "../Icon/Icon";
import Tab from "./Tab";

export default function TabBar({ className }: { className?: string }) {
  return (
    <nav className={`flex justify-between items-center ${className || ""}`}>
      <Tab to="/gated/servers">
        <Icon name="home" className="w-5 h-5" />
      </Tab>
      <Tab to="/gated/keepass">
        <Icon name="shield" className="w-5 h-5" />
      </Tab>
      <Tab to="/gated/user">
        <Icon name="user" className="w-5 h-5" />
      </Tab>
      <Tab to="/gated/notifications">
        <Icon name="notification" className="w-5 h-5" />
      </Tab>
      <Tab to="/gated/settings">
        <Icon name="menu" className="w-5 h-5" />
      </Tab>
    </nav>
  );
}
