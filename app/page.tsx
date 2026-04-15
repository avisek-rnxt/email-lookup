'use client';

import { motion } from 'framer-motion';
import BatchLookup from './batch';

export default function Page() {
  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="page-head">
        <div>
          <h1>Bulk email finder</h1>
          <p className="page-sub">
            Upload a CSV of names + domains. Pattern detection runs against
            the live MX record; results are confidence-scored and exportable.
          </p>
        </div>
      </header>

      <BatchLookup />

      <p className="foot">internal · email workbench</p>
    </motion.div>
  );
}
