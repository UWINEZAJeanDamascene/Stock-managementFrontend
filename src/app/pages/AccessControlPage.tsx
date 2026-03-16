import { useEffect, useState } from 'react';
import { accessApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

export default function AccessControlPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await accessApi.getRoles();
      setRoles((res as any).data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const createRole = async () => {
    try {
      await accessApi.createRole({ name, description, permissions: [] });
      setName(''); setDescription('');
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Access Control</h2>
      <section className="mb-6">
        <h3 className="font-medium mb-2">Roles</h3>
        <div className="mb-4 flex gap-2">
          <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={createRole}>Create</Button>
        </div>
        <div>
          {loading ? (
            <p>Loading roles…</p>
          ) : (
            <ul className="space-y-2">
              {roles.map(r => (
                <li key={r._id} className="p-2 border rounded">{r.name} — {r.description}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-medium mb-2">Two-factor Authentication (2FA)</h3>
        <div className="flex gap-2 items-center">
          <Button onClick={async () => {
            try {
              const res = await accessApi.setup2FA();
              const { qr } = (res as any).data || {};
              if (qr) {
                const win = window.open();
                win?.document.write(`<img src="${qr}"/>`);
              }
            } catch (err) { console.error(err); }
          }}>Setup 2FA</Button>
        </div>
      </section>
    </div>
  );
}
