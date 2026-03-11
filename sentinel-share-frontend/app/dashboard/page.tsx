'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import FileList from '@/components/FileList';
import FileUploadForm from '@/components/FileUploadForm';
import { api } from '@/lib/api';
import { clearSession, getUser } from '@/lib/auth';
import type { FileRecord, User } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUser<User>();

  useEffect(() => {
    api.files
      .list()
      .then((res) => setFiles(res.files))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleUploaded(file: FileRecord) {
    setFiles((prev) => [file, ...prev]);
  }

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SentinelShare</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>

        {/* Upload */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Upload
          </h2>
          <FileUploadForm onUploaded={handleUploaded} />
        </section>

        {/* File list */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Your files
          </h2>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : (
            <FileList files={files} onDeleted={handleDeleted} />
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
