import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { User, Bell, Lock, Users, MessageCircle, Shield, Globe, HelpCircle } from 'lucide-react';
import '../../styles/components/settings.css';

export default function SettingsLayout() {
  const location = useLocation();

  const navGroups = [
    {
      title: 'How you use AI Social',
      items: [
        { to: '/settings/edit-profile', icon: User, label: 'Edit profile' },
        { to: '/settings/notifications', icon: Bell, label: 'Notifications' },
      ]
    },
    {
      title: 'Who can see your content',
      items: [
        { to: '/settings/privacy', icon: Lock, label: 'Account privacy' },
        { to: '/settings/close-friends', icon: Users, label: 'Close Friends' },
      ]
    },
    {
      title: 'How others can interact with you',
      items: [
        { to: '/settings/interactions', icon: MessageCircle, label: 'Messages and story replies' },
      ]
    },
    {
      title: 'What you see',
      items: [
        { to: '/settings/content-preferences', icon: Shield, label: 'Content preferences' },
      ]
    },
    {
      title: 'Your app and media',
      items: [
        { to: '/settings/language', icon: Globe, label: 'Language' },
      ]
    },
    {
      title: 'More info and support',
      items: [
        { to: '/settings/help', icon: HelpCircle, label: 'Help' },
      ]
    },
  ];

  return (
    <div className="settings-layout">
      {/* Sidebar for settings */}
      <div className="settings-sidebar">
        <h2 className="settings-sidebar__title">Settings</h2>
        <div className="settings-nav">
          {navGroups.map((group, idx) => (
            <div key={idx} className="settings-nav-group">
              <h3 className="settings-nav-group__title">{group.title}</h3>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 
                    `settings-nav-link ${isActive ? 'settings-nav-link--active' : ''}`
                  }
                >
                  <item.icon size={20} className="settings-nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="settings-content">
        <div className="settings-content-inner">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
