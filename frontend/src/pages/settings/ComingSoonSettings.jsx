export default function ComingSoonSettings({ title, description }) {
  return (
    <div>
      <div className="settings-header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="empty-state" style={{ padding: '4rem 2rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Coming Soon</h3>
        <p>This setting is currently in development and will be rolling out soon.</p>
      </div>
    </div>
  );
}
