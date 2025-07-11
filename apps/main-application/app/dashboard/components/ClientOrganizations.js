import { memo } from 'react';
import Link from 'next/link';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ClientOrganizationItem = memo(({ client }) => (
  <li className="px-4 py-4 hover:bg-gray-50">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{client.name}</p>
        <p className="text-sm text-gray-500">Created {formatDate(client.created_at)}</p>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs rounded-full ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {client.is_active ? 'Active' : 'Inactive'}
        </span>
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm"
        >
          Manage
        </Link>
      </div>
    </div>
  </li>
));

ClientOrganizationItem.displayName = 'ClientOrganizationItem';

const ClientOrganizations = ({ clientOrganizations }) => {
  return (
    <div className="mb-8">
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Client Organizations</h3>
          <Link
            href="/dashboard/clients/new"
            className="text-sm text-indigo-600 hover:text-indigo-900"
          >
            Add Client
          </Link>
        </div>
        <div className="border-t border-gray-200">
          {clientOrganizations.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {clientOrganizations.map((client) => (
                <ClientOrganizationItem key={client.id} client={client} />
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm text-gray-500">
              No client organizations yet. <Link href="/dashboard/clients/new" className="text-indigo-600 hover:text-indigo-900">Add your first client</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ClientOrganizations);