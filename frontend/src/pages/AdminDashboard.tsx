import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/auth';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  dispatcher: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  viewer: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
};

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionError('');
    try {
      const updated = await usersApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to update role'
          : 'Failed to update role';
      setActionError(message);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionError('');
    try {
      await usersApi.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDelete(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to delete user'
          : 'Failed to delete user';
      setActionError(message);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-stone-500 dark:text-stone-400">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">User Management</h1>
        <span className="text-sm text-stone-500 dark:text-stone-400">{users.length} user{users.length !== 1 ? 's' : ''}</span>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
          {actionError}
        </div>
      )}

      <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden sm:table-cell">Joined</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className={isSelf ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {u.name}
                        {isSelf && <span className="ml-2 text-xs text-teal-600 dark:text-teal-400">(you)</span>}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs border border-stone-300 dark:border-stone-700 rounded px-2 py-1 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="admin">Admin</option>
                        <option value="dispatcher">Dispatcher</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isSelf ? (
                      <span className="text-xs text-stone-400">—</span>
                    ) : confirmDelete === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
