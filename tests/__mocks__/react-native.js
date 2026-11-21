module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  Linking: {
    openURL: () => Promise.resolve(),
    openSettings: () => Promise.resolve(),
  },
  Share: {
    share: () => Promise.resolve(),
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    addEventListener: () => ({ remove: () => {} }),
  },
  StyleSheet: {
    create: (s) => s,
    absoluteFill: {},
  },
};
