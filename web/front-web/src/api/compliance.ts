import api from './request';
import type { ComplianceCheckParams, ComplianceCheckResult } from '../types/compliance';

export const complianceApi = {
  check: (data: ComplianceCheckParams): Promise<ComplianceCheckResult> =>
    api.post('/compliance/check', data),

  originality: (data: ComplianceCheckParams): Promise<ComplianceCheckResult> =>
    api.post('/compliance/originality', data),
};
