'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import ShareLinkModal from './ShareLinkModal';
import type { FileRecord } from '@/types';

interface FileListProps {
  files: FileRecord[];
  onDeleted: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({ files, onDeleted }: FileListProps) {
  const [shareTarget, setShareTarget] = useState<FileRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDownload(file: FileRecord) {
    setError('');
    setDownloadingId(file.id);
    try {
      const res = await api.files.download(file.id);
      // Open presigned URL — browser handles the download
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(file: FileRecord) {
    if (!confirm(`Delete "${file.original_name}"? This cannot be undone.`)) return;
    setError('');
    setDeletingId(file.id);
    try {
      await api.files.delete(file.id);
      onDeleted(file.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
        <p className="text-sm text-gray-400">No files yet. Upload your first file.</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.original_name}</p>
              <p className="text-xs text-gray-400">
                {formatBytes(file.size_bytes)} &middot;{' '}
                {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingId === file.id}
                className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40"
              >
                {downloadingId === file.id ? '…' : 'Download'}
              </button>

              <button
                onClick={() => setShareTarget(file)}
                className="rounded px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Share
              </button>

              <button
                onClick={() => handleDelete(file)}
                disabled={deletingId === file.id}
                className="rounded px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                {deletingId === file.id ? '…' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {shareTarget && (
        <ShareLinkModal file={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </>
  );
}
