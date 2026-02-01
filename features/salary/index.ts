// Salary Feature Export
import { Feature } from '@/core/types/feature';
import SalaryFeature from './SalaryFeature';

export const salaryFeature: Feature = {
  id: 'salary',
  name: 'Salary Management',
  version: '1.0.0',
  component: SalaryFeature,

  configSchema: {
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people in this workspace (Staff, Students, Team, etc.)',
    },
  },
};

// Export hooks
export { useSalaryCalculation } from './hooks/useSalaryCalculation';
