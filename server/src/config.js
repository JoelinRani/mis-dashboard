const path = require('path');

// Folder where the 4 department Excel files live. In production this should
// point at the shared folder (a mapped network drive or mounted path on the
// internal server), e.g. DATA_FOLDER=/mnt/shared/mis-dashboards
const DATA_FOLDER = process.env.DATA_FOLDER
  ? path.resolve(process.env.DATA_FOLDER)
  : path.join(__dirname, '..', 'data');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Each department is matched against files in DATA_FOLDER by keyword (case
// insensitive substring match against the filename) rather than an exact
// name, so the app keeps working if the shared copy is renamed slightly
// (e.g. "Marketing Lead Generation_Clientwise Dashboard.xlsx" vs
// "Marketing_Lead_Generation_Clientwise_Dashboard.xlsx").
const DEPARTMENTS = [
  {
    id: 'marketing',
    label: 'Marketing Lead Generation',
    matchKeywords: ['marketing', 'lead generation'],
  },
  {
    id: 'cre-utilization',
    label: 'MIS Client Utilization (CRE)',
    matchKeywords: ['client_utilization', 'client utilization', 'utilization dashboard'],
  },
  {
    id: 'outbound-desk',
    label: 'Outbound Desk',
    matchKeywords: ['outbound'],
  },
  {
    id: 'sw-engineering',
    label: 'Software Engineering',
    matchKeywords: ['swengg', 'sw engg', 'software'],
  },
];

module.exports = { DATA_FOLDER, PORT, DEPARTMENTS };
