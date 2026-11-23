import { mainTabPanelId, mainTabs, type MainTab } from './main-tabs';
import { LiquidNavbar as Waterline, type LiquidNavItem } from './ui/liquid-glass-navbar.web';
import { c, Icon } from './ui';

const tabItems: LiquidNavItem[] = mainTabs.map(tab => ({
  label: tab.name, id: tab.id, icon: <Icon name={tab.icon} size={21} color="currentColor" />, fx: 'pop',
}));

export function LiquidNavbar({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  return <Waterline
    className="companion-dock"
    label="Main navigation"
    tabPanelId={mainTabPanelId}
    items={tabItems}
    active={mainTabs.findIndex(tab => tab.name === active)}
    onChange={index => onChange(mainTabs[index].name)}
    compact={false}
    style={{
      color: c.ink, alignSelf: 'center', width: '90%', maxWidth: 396, margin: '4px 0 10px',
    }}
  />;
}
