# Notifications & Vibration Guide

## How It Works

### When Page is Active/Visible
- **Sound**: Plays immediately via Audio API
- **Vibration**: Uses `navigator.vibrate()` API directly
- **Notification**: Shows browser notification

### When Device is Locked or Browser Minimized
- **Sound**: Service worker plays sound using Web Audio API
- **Vibration**: Browser notification's `vibrate` option (if browser/OS supports it)
- **Notification**: Service worker shows notification with vibration pattern

## Browser Support

### Vibration When Locked
The notification's `vibrate` option works when the device is locked on:
- ✅ **Chrome/Edge on Android** - Full support
- ✅ **Samsung Internet on Android** - Full support
- ⚠️ **Safari on iOS** - Limited support (iOS handles notifications differently)
- ❌ **Desktop browsers** - No vibration support

### Requirements
1. **HTTPS** - Required for service workers and notifications when locked
2. **Notification Permission** - Must be granted (requested on first load)
3. **Service Worker** - Must be registered and active

## Testing

1. **Test when active:**
   - Open app on mobile device
   - Join as player
   - Wait until you're next
   - Should hear sound and feel vibration

2. **Test when locked:**
   - Open app on mobile device
   - Lock the device
   - Have GM advance turns until you're next
   - Should receive notification with vibration (if browser supports it)

## Troubleshooting

### No vibration when locked
- Check if browser supports notification vibration (Chrome/Edge on Android work best)
- Ensure notification permission is granted
- Check browser console for errors
- Try on a different browser/device

### No sound when locked
- Ensure HTTPS is enabled (required for service workers when locked)
- Check service worker is registered (see browser DevTools > Application > Service Workers)
- Check browser console for audio errors

### Notifications not showing
- Check notification permission status
- Ensure service worker is active
- Check browser notification settings
- Some browsers require user interaction before showing notifications

