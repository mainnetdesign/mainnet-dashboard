import { Collaborator } from '@/types'
export type { Collaborator }

export const COLLABORATORS: Collaborator[] = [
  {
    id: '679806a8e673c334c74bdf22',
    name: 'Marcus',
    color: '#E8744C',
    monthlySalary: 8000,
  },
  {
    id: '6797f89c36a9472c09565b3b',
    name: 'Djturzin',
    color: '#4CAF50',
    hourlyRate: 50,
  },
  {
    id: '68cacb444fcc90742d8f0a20',
    name: 'João',
    color: '#2196F3',
    monthlySalary: 1621,
  },
  {
    id: '6877eeaa50411c7f162733a9',
    name: 'Victória',
    color: '#E91E8C',
    monthlySalary: 1803.60,
  },
  {
    id: '6868146b46e5ca7f93e2e513',
    name: 'Emanuelly',
    color: '#9C27B0',
    monthlySalary: 1652.40,
  },
  {
    id: '6903df80de2b3052eadb3448',
    name: 'Raphael',
    color: '#F5A623',
    monthlySalary: 1057,
  },
]

export const COLLABORATOR_IDS = new Set(COLLABORATORS.map((c) => c.id))
export const COLLABORATOR_MAP = new Map(COLLABORATORS.map((c) => [c.id, c]))
