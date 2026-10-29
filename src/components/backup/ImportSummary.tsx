// Preview all counts, tombstones and identity warnings before allowing any write.
import type { ImportPreview } from '../../backup/import'

export function ImportSummary({ preview }: { preview: ImportPreview }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Import record counts">
        <table className="w-full text-left">
          <caption className="text-left font-semibold">
            Import preview (includes deleted records)
          </caption>
          <thead>
            <tr>
              {[
                'Table',
                'Current',
                'File',
                'New',
                'Identical',
                'Conflicts kept',
                'Deleted in file',
              ].map((label) => (
                <th key={label} scope="col" className="p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.counts.map((row) => (
              <tr key={row.table}>
                <th scope="row" className="p-2">
                  {row.table}
                </th>
                {[
                  row.current,
                  row.incoming,
                  row.added,
                  row.identical,
                  row.conflicts,
                  row.deleted,
                ].map((count, index) => (
                  <td key={index} className="p-2">
                    {count}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Merge adds new IDs and keeps existing versions, including deletions. It never combines
        people based on their names. New links can reference the existing versions.
      </p>
      {preview.conflicts.length > 0 && (
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center">
            {preview.conflicts.length} conflicting IDs: existing versions will be kept on merge
          </summary>
          <ul className="max-h-60 overflow-y-auto">
            {preview.conflicts.slice(0, 50).map((row) => (
              <li key={`${row.table}:${row.id}`} className="my-2 break-words rounded-xl border p-3">
                <p>
                  {row.table}: {row.id}
                </p>
                <p>Existing: {row.existing}</p>
                <p>File: {row.incoming}</p>
              </li>
            ))}
          </ul>
          {preview.conflicts.length > 50 && (
            <p>Showing the first 50 conflicts. Review the source file before proceeding.</p>
          )}
        </details>
      )}
      {preview.possibleDuplicates.length > 0 && (
        <details open>
          <summary className="flex min-h-12 cursor-pointer items-center">
            {preview.possibleDuplicates.length} possible same-name identities
          </summary>
          <ul>
            {preview.possibleDuplicates.slice(0, 50).map((row) => (
              <li className="my-2 break-words" key={row.id}>
                {row.name}: {row.id}
              </li>
            ))}
          </ul>
          <p>
            Different IDs remain separate on merge. Replacement uses the file's identities. Cancel
            if you are unsure.
          </p>
        </details>
      )}
    </div>
  )
}
