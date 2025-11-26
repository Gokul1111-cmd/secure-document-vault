export const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'admin@vault.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    status: 'active',
    lastLogin: '2025-01-15 14:30:00',
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    email: 'user@vault.com',
    password: 'user123',
    role: 'user',
    avatar: 'https://images.pexels.com/photos/3764370/pexels-photo-3764370.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    status: 'active',
    lastLogin: '2025-01-15 12:15:00',
    createdAt: '2024-02-20'
  },
  {
    id: 3,
    name: 'Mike Johnson',
    email: 'mike@vault.com',
    password: 'mike123',
    role: 'user',
    avatar: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    status: 'inactive',
    lastLogin: '2025-01-10 09:45:00',
    createdAt: '2024-03-10'
  }
];

export const mockDocuments = [
  {
    id: 1,
    name: 'Financial_Report_Q4_2024.pdf',
    size: '2.4 MB',
    uploadDate: '2025-01-10 10:30:00',
    status: 'encrypted',
    type: 'pdf',
    userId: 2,
    downloads: 3,
    lastAccessed: '2025-01-14 16:20:00'
  },
  {
    id: 2,
    name: 'Employee_Contracts_2024.docx',
    size: '1.8 MB',
    uploadDate: '2025-01-08 14:15:00',
    status: 'encrypted',
    type: 'docx',
    userId: 2,
    downloads: 1,
    lastAccessed: '2025-01-12 11:30:00'
  },
  {
    id: 3,
    name: 'Security_Audit_2024.xlsx',
    size: '3.2 MB',
    uploadDate: '2025-01-05 09:45:00',
    status: 'encrypted',
    type: 'xlsx',
    userId: 1,
    downloads: 5,
    lastAccessed: '2025-01-15 13:10:00'
  },
  {
    id: 4,
    name: 'Confidential_Meeting_Notes.txt',
    size: '0.5 MB',
    uploadDate: '2025-01-03 16:20:00',
    status: 'processing',
    type: 'txt',
    userId: 3,
    downloads: 0,
    lastAccessed: null
  }
];

export const mockAuditLogs = [
  {
    id: 1,
    user: 'John Doe',
    action: 'Document Download',
    resource: 'Financial_Report_Q4_2024.pdf',
    timestamp: '2025-01-15 14:25:00',
    ipAddress: '192.168.1.100',
    status: 'success',
    userAgent: 'Chrome/120.0.0.0'
  },
  {
    id: 2,
    user: 'Sarah Wilson',
    action: 'Document Upload',
    resource: 'Employee_Contracts_2024.docx',
    timestamp: '2025-01-15 12:10:00',
    ipAddress: '192.168.1.101',
    status: 'success',
    userAgent: 'Firefox/121.0.0.0'
  },
  {
    id: 3,
    user: 'Mike Johnson',
    action: 'Login Attempt',
    resource: 'Authentication',
    timestamp: '2025-01-15 11:45:00',
    ipAddress: '192.168.1.102',
    status: 'failed',
    userAgent: 'Safari/17.2.0'
  },
  {
    id: 4,
    user: 'John Doe',
    action: 'User Role Update',
    resource: 'Sarah Wilson',
    timestamp: '2025-01-15 10:30:00',
    ipAddress: '192.168.1.100',
    status: 'success',
    userAgent: 'Chrome/120.0.0.0'
  },
  {
    id: 5,
    user: 'Sarah Wilson',
    action: 'Document View',
    resource: 'Security_Audit_2024.xlsx',
    timestamp: '2025-01-15 09:15:00',
    ipAddress: '192.168.1.101',
    status: 'success',
    userAgent: 'Firefox/121.0.0.0'
  }
];