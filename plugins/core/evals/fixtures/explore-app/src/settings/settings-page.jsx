import { DisplayNameField } from './display-name-field';

export function SettingsPage({ profile, channels, onSave }) {
  const dirty = false;

  return (
    <main>
      <h1>Settings</h1>

      <h2>Display name</h2>
      <DisplayNameField initialValue={profile.displayName} />

      <h2>Notification channels</h2>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id}>{channel.label}</li>
        ))}
      </ul>

      <h2>Danger zone</h2>
      <button onClick={() => onSave({ deleteWorkspace: true })}>
        Delete workspace
      </button>

      <button disabled={!dirty} onClick={() => onSave(profile)}>
        Save changes
      </button>

      <div role="status" />
    </main>
  );
}
