'use client';

import { FeatureProps } from '@/core/types/feature';
import { EducationSchedulingView } from './EducationSchedulingView';

/**
 * Education Scheduling Feature
 *
 * For education workspaces, we use a timetable view instead of staff schedules.
 * This shows class sessions organized by day of week.
 */
export default function EducationSchedulingFeature({ workspaceId, config }: FeatureProps) {
  return <EducationSchedulingView workspaceId={workspaceId} config={config} />;
}
