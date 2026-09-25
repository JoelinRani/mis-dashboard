const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const DEPARTMENTS = [
  {
    id: 'marketing',
    label: 'Marketing Lead Generation',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQDime4OlOK9QKMr3DQA3vjgAXm2AuXdI9SyMGPUBodwdF0?e=SkLm1f',
  },
  {
    id: 'cre-utilization',
    label: 'MIS Client Utilization (CRE)',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQCt9r0XN-0hSrwFMU-FLjBcAT4IYRE2yVROWBWFnii0dAM?e=wRNnTf',
  },
  {
    id: 'outbound-desk',
    label: 'Outbound Desk',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQCKqLzToLKZTpH2Onw1s45nAVgwY510UYS5LPKTaUsitVk?e=5Wyg44',
  },
  {
    id: 'sw-engineering',
    label: 'Software Engineering',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQC_Xo4hK73wSpdebZ4kXvXEAVUnnIFSTHDRJ4fnv3CHivk?e=ijEWjP',
  },
  {
    id: 'it-operations',
    label: 'Weekly IT MIS & Operations',
    cloudUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQBFZ0Gcr1oqQL59L9uoQHEpAebC8cRUGye9-iY_Azqck4E?e=hIgQME',
  },
];

module.exports = { PORT, DEPARTMENTS };
