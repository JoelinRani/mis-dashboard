const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const DEPARTMENTS = [
  {
    id: 'marketing',
    label: 'Marketing Lead Generation',
    fileName: 'Marketing Lead Generation_Clientwise Dashboard.xlsx',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQDime4OlOK9QKMr3DQA3vjgAXm2AuXdI9SyMGPUBodwdF0?e=SkLm1f',
  },
  {
    id: 'cre-utilization',
    label: 'MIS Client Utilization (CRE)',
    fileName: 'MIS_Client_Utilization_Dashboard - CRE.xlsx',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQCt9r0XN-0hSrwFMU-FLjBcAT4IYRE2yVROWBWFnii0dAM?e=wRNnTf',
  },
  {
    id: 'outbound-desk',
    label: 'Outbound Desk',
    fileName: 'Outbound-desk-mis-dashboard.xlsx',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQCKqLzToLKZTpH2Onw1s45nAVgwY510UYS5LPKTaUsitVk?e=5Wyg44',
  },
  {
    id: 'sw-engineering',
    label: 'Software Engineering',
    fileName: 'SWEngg_MIS_Report_Aug_Draft.xlsx',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQC_Xo4hK73wSpdebZ4kXvXEAVUnnIFSTHDRJ4fnv3CHivk?e=ijEWjP',
  },
  {
    id: 'it-operations',
    label: 'Weekly IT MIS & Operations',
    fileName: 'Weekly_IT_MIS_Report_V1.xlsx',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQBFZ0Gcr1oqQL59L9uoQHEpAebC8cRUGye9-iY_Azqck4E?e=hIgQME',
  },
  {
    id: 'hr-query',
    label: 'HR Query & Support',
    fileName: 'HR Query Report.xlsm',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQC4aZ2CFH53S6yeoVW7i4cSAbG5CYsdneFrot6Gxi17tfU?e=bE4CIs',
  },
];

module.exports = { PORT, DEPARTMENTS };
