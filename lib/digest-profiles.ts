export type DeliveryChannel = 'email' | 'slack';

export interface DigestProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  slackWebhookUrl?: string;
  focusAreas: string[];
  deliveryChannels: DeliveryChannel[];
  tone?: 'board' | 'operator' | 'financial' | 'product';
}

const DEFAULT_FOCUS_AREAS = [
  'market expansion',
  'pricing pressure',
  'technology differentiation',
  'operational risk',
];

function normalizeProfile(raw: Partial<DigestProfile>, index: number): DigestProfile | null {
  const id = (raw.id || `exec-${index + 1}`).trim();
  const name = (raw.name || '').trim();
  if (!name) return null;

  const channels = (raw.deliveryChannels || []).filter(
    (channel): channel is DeliveryChannel => channel === 'email' || channel === 'slack'
  );

  return {
    id,
    name,
    role: (raw.role || 'Executive').trim(),
    email: raw.email?.trim(),
    slackWebhookUrl: raw.slackWebhookUrl?.trim(),
    focusAreas:
      raw.focusAreas && raw.focusAreas.length > 0
        ? raw.focusAreas.map((item) => item.trim()).filter(Boolean)
        : DEFAULT_FOCUS_AREAS,
    deliveryChannels: channels.length > 0 ? channels : ['email'],
    tone: raw.tone || 'board',
  };
}

export function getDigestProfiles(): DigestProfile[] {
  const envProfiles = process.env.EXECUTIVE_DIGEST_PROFILES_JSON;

  if (envProfiles) {
    try {
      const parsed = JSON.parse(envProfiles) as Partial<DigestProfile>[];
      const normalized = parsed
        .map((item, index) => normalizeProfile(item, index))
        .filter((item): item is DigestProfile => Boolean(item));
      if (normalized.length > 0) return normalized;
    } catch (error) {
      console.error('Failed to parse EXECUTIVE_DIGEST_PROFILES_JSON:', error);
    }
  }

  const fallbackRecipients = (process.env.DIGEST_EMAIL_TO || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (fallbackRecipients.length > 0) {
    return fallbackRecipients.map((email, index) => ({
      id: `default-${index + 1}`,
      name: `Executive ${index + 1}`,
      role: 'Executive Team',
      email,
      focusAreas: DEFAULT_FOCUS_AREAS,
      deliveryChannels: ['email'],
      tone: 'board',
    }));
  }

  return [
    {
      id: 'default',
      name: 'Executive Team',
      role: 'Leadership',
      focusAreas: DEFAULT_FOCUS_AREAS,
      deliveryChannels: ['email'],
      tone: 'board',
    },
  ];
}

export function getProfileById(profileId?: string | null): DigestProfile | null {
  const profiles = getDigestProfiles();
  if (!profileId) return profiles[0] || null;
  return profiles.find((profile) => profile.id === profileId) || null;
}

