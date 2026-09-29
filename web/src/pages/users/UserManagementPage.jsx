import { useEffect, useState } from 'react';
import { createUser, getUsers, updateUser, updateUserStatus } from '../../services/userService.js';

const emptyForm = {
  name: '',
  username: '',
  email: '',
  contactNumber: '',
  password: '',
  role: 'GridOperator'
};

export default function UserManagementPage({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadUsers() {
    setIsLoading(true);
    try {
      setUsers(await getUsers());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      contactNumber: user.contactNumber,
      password: '',
      role: user.role
    });
    setMessage(`Editing ${user.username}`);
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setError('');
  }

  async function saveUser(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      if (editingId) {
        await updateUser(editingId, {
          name: form.name,
          email: form.email,
          contactNumber: form.contactNumber,
          role: form.role,
          password: form.password || null
        });
        setMessage('User updated.');
      } else {
        await createUser(form);
        setMessage('User created.');
      }
      resetForm();
      await loadUsers();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function toggleStatus(user) {
    setError('');
    try {
      await updateUserStatus(user.id, !user.isActive);
      setMessage(`${user.username} is now ${user.isActive ? 'inactive' : 'active'}.`);
      await loadUsers();
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  return (
    <main className="management-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Backoffice / Accounts</p>
          <h1>User management</h1>
          <p className="subtitle">Manage web access for Backoffice and Grid Operator users.</p>
        </div>
        <button className="secondary-button" onClick={onLogout}>Log out</button>
      </header>

      <div className="management-grid">
        <section className="user-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Web users</h2>
            </div>
            <button onClick={resetForm}>New user</button>
          </div>
          {isLoading && <p className="muted">Loading users...</p>}
          {!isLoading && users.length === 0 && <p className="muted">No web users found.</p>}
          {!isLoading && users.length > 0 && (
            <div className="user-table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.name}</strong><small>{user.email}</small></td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                      <td><span className={user.isActive ? 'active-label' : 'inactive-label'}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="row-actions">
                        <button className="link-button" onClick={() => startEdit(user)}>View / edit</button>
                        <button className="link-button" onClick={() => toggleStatus(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="user-form-panel">
          <p className="eyebrow">{editingId ? 'User details' : 'Create account'}</p>
          <h2>{editingId ? 'Update user' : 'New web user'}</h2>
          <form onSubmit={saveUser} className="user-form">
            <label>Name<input name="name" value={form.name} onChange={updateField} required /></label>
            <label>Username<input name="username" value={form.username} onChange={updateField} disabled={Boolean(editingId)} required /></label>
            <label>Email<input name="email" type="email" value={form.email} onChange={updateField} required /></label>
            <label>Contact number<input name="contactNumber" value={form.contactNumber} onChange={updateField} /></label>
            <label>Role<select name="role" value={form.role} onChange={updateField}><option value="GridOperator">Grid Operator</option><option value="Backoffice">Backoffice</option></select></label>
            <label>{editingId ? 'New password (optional)' : 'Password'}<input name="password" type="password" value={form.password} onChange={updateField} required={!editingId} minLength="8" /></label>
            {error && <p className="error" role="alert">{error}</p>}
            {message && <p className="success" role="status">{message}</p>}
            <div className="form-actions"><button type="submit">{editingId ? 'Save changes' : 'Create user'}</button>{editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>}</div>
          </form>
        </section>
      </div>
    </main>
  );
}
