interface SchedulingParams {
  scheduledDate?: Date;
  content: string;
  platforms: string[];
  integrations: Array<{ connected: boolean; expiresAt?: string | null }>;
  existingJobs: any[];
  timezone?: string;
}

export function validateScheduling(params: SchedulingParams): { 
  valid: boolean; 
  errors: string[]; 
  warnings: string[] 
} {
  const { scheduledDate, integrations, existingJobs, timezone = 'UTC' } = params;
  
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!scheduledDate) {
    return { valid: true, errors, warnings };
  }

  // Use timezone-aware comparison
  const now = new Date();
  const minDate = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now

  // Must be at least 2 minutes in the future
  if (scheduledDate < minDate) {
    errors.push('Schedule time must be at least 2 minutes from now');
  }

  // Check if scheduled time is in the past
  if (scheduledDate < now) {
    errors.push('Schedule time cannot be in the past');
  }

  // Check integration token expiry for all integrations
  integrations.forEach((integration, index) => {
    if (integration.expiresAt) {
      const expiryDate = new Date(integration.expiresAt);
      if (scheduledDate > expiryDate) {
        warnings.push(`Access token for account ${index + 1} may expire before scheduled time`);
      }
    }
  });

  // Rate limit check (max 10 posts per hour)
  const oneHourAfter = new Date(scheduledDate.getTime() + 60 * 60 * 1000);
  const oneHourBefore = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
  
  const postsInWindow = existingJobs.filter(job => {
    const jobDate = new Date(job.scheduled_for);
    return jobDate >= oneHourBefore && jobDate <= oneHourAfter;
  });

  if (postsInWindow.length >= 10) {
    warnings.push('You have 10+ posts scheduled within this 2-hour window. Consider spacing them out.');
  }

  // Warn if scheduling too far in advance (30 days)
  const maxAdvance = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (scheduledDate > maxAdvance) {
    warnings.push('Scheduling more than 30 days in advance. Ensure your integrations remain connected.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
