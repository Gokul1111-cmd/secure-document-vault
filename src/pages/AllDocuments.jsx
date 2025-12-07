import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { adminAPI } from '../services/api.js';
import { FileText, Search, Download, HardDrive, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Button from '../components/ui/Button.jsx';

function AllDocuments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    totalSize: 0,
    totalDownloads: 0
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') {
      navigate('/dashboard');
      showToast('Access denied: Admin privileges required', 'error');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Calculate offset for backend (backend uses limit/offset, not page)
        const offset = (page - 1) * ITEMS_PER_PAGE;
        
        const documentsResponse = await adminAPI.getAllDocuments({ 
          limit: ITEMS_PER_PAGE, 
          offset: offset 
        });
        const docsData = documentsResponse.data.data;

        setAllDocuments(docsData.documents);
        setStats({
          total: docsData.total,
          totalSize: docsData.totalSize,
          totalDownloads: docsData.totalDownloads,
        });
        
        // Calculate total pages based on total count from backend
        setTotalPages(Math.ceil(docsData.total / ITEMS_PER_PAGE));

        // Only fetch users once if needed, or could be paginated too
        const usersResponse = await adminAPI.getUsers();
        setUsers(usersResponse.data.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, showToast, page]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredDocuments = allDocuments.filter((doc) => {
    const query = searchTerm.toLowerCase();
    return (
      doc.fileName.toLowerCase().includes(query) ||
      doc.owner.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">All Documents</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">Review and manage every document uploaded across the organization.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading documents..." />
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">Total Documents</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-white sm:text-2xl">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-600 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:text-sm">Total Downloads</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-white sm:text-2xl">{stats.totalDownloads}</p>
                </div>
                <div className="p-3 bg-emerald-600 rounded-lg">
                  <Download className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 sm:text-sm">Storage Used</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-white sm:text-2xl">{formatFileSize(stats.totalSize)}</p>
                </div>
                <div className="p-3 bg-purple-600 rounded-lg">
                  <HardDrive className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card padding="sm">
            <Card.Content>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  placeholder="Search by file name or owner email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} />}
                  className="w-full sm:max-w-xs"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  Showing page {page} of {totalPages}
                </p>
              </div>
            </Card.Content>
          </Card>

          {/* Documents Table */}
          <Card>
            <Card.Header className="space-y-1">
              <Card.Title>All Documents</Card.Title>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Showing {filteredDocuments.length} documents on this page.</p>
            </Card.Header>
            <Card.Content>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Document</Table.Head>
                    <Table.Head>Owner</Table.Head>
                    <Table.Head>Size</Table.Head>
                    <Table.Head>Upload Date</Table.Head>
                    <Table.Head>Downloads</Table.Head>
                    <Table.Head>Status</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredDocuments.map((doc) => (
                    <Table.Row key={doc.id}>
                      <Table.Cell>
                        <div className="flex items-start space-x-3">
                          <FileText className="mt-0.5 h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">{doc.fileName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{doc.mimeType}</p>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">{doc.owner.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">{doc.owner.email}</p>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">{formatFileSize(doc.fileSize)}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-slate-500 dark:text-slate-500">
                            {new Date(doc.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center space-x-1 text-sm sm:text-base">
                          <Download size={14} className="text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">{doc.downloadCount}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                          Encrypted
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm sm:text-base">No documents found.</p>
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                 >
                    <ChevronLeft size={16} className="mr-1" /> Previous
                 </Button>
                 <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</span>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                 >
                    Next <ChevronRight size={16} className="ml-1" />
                 </Button>
              </div>
            </Card.Content>
          </Card>

          {/* Users List */}
          <Card>
            <Card.Header>
              <Card.Title>Users with Documents</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-col gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">{u.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-left text-xs text-slate-500 dark:text-slate-400 sm:text-right sm:text-sm">
                      <p className="font-medium text-slate-600 dark:text-slate-300">Member since</p>
                      <p className="text-slate-900 dark:text-white">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}

export default AllDocuments;