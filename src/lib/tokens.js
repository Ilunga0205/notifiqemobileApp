// src/lib/tokens.js
// Notifiqe Design System — mirrors web CSS variables exactly
// Use these everywhere instead of hardcoded colors/values

export const colors = {
  // Backgrounds
  white:        '#FFFFFF',
  surface:      '#F8F9FA',

  // Brand
  brand:        '#1D4ED8',
  brandLight:   '#EFF6FF',
  brandBorder:  '#BFDBFE',

  // Text
  black:        '#0F172A',
  body:         '#1E293B',
  muted:        '#64748B',
  subtle:       '#94A3B8',
  placeholder:  '#CBD5E1',

  // Borders
  border:       '#E2E8F0',
  borderLight:  '#F1F5F9',

  // States
  error:        '#EF4444',
  errorBg:      '#FEF2F2',
  warning:      '#F59E0B',
  success:      '#10B981',

  // Post type colors (matches PRD icons)
  announcement: '#1D4ED8',   // blue
  leave:        '#F59E0B',   // amber
  project:      '#8B5CF6',   // purple
  question:     '#EC4899',   // pink
  win:          '#10B981',   // green
  general:      '#64748B',   // slate
};

export const typography = {
  // Font — Inter (matches web exactly)
  fontFamily: 'Inter',        // we'll set this up with a custom font

  // Sizes (matches web rem scale)
  xs:   11,   // 0.75rem
  sm:   12,   // 0.78rem
  base: 14,   // 0.875rem
  md:   15,   // 0.95rem
  lg:   16,   // 1rem
  xl:   20,   // 1.25rem
  xxl:  24,   // 1.5rem
  h2:   28,   // 1.75rem
  h1:   30,   // 1.9rem

  // Weights
  normal:    '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  black:     '900',
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  page: 20,   // horizontal page padding
};

export const radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
};

export const shadows = {
  // Subtle — matches "soft shadows, nothing dramatic"
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};

// Post types — maps to PRD exactly
export const POST_TYPES = [
  { id: 'announcement', label: 'Announcement', icon: '📢', color: colors.announcement, notify: true },
  { id: 'leave',        label: 'Leave Notice',  icon: '🏖️', color: colors.leave,        notify: false },
  { id: 'project',      label: 'Project Update',icon: '📁', color: colors.project,      notify: false },
  { id: 'question',     label: 'Quick Question',icon: '❓', color: colors.question,     notify: false },
  { id: 'win',          label: 'Team Win',       icon: '🎉', color: colors.win,          notify: false },
  { id: 'general',      label: 'General Update', icon: '📝', color: colors.general,      notify: false },
];