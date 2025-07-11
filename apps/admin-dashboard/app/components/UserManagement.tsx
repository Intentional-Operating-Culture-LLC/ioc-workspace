'use client';

import { motion } from 'framer-motion';

export function UserManagement() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
      <div className="text-center py-12 text-gray-500">
        <p>User Management Interface - Coming Soon</p>
      </div>
    </motion.div>
  );
}