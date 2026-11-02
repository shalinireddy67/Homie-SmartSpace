import type { Rule, Device } from '@/types';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a clean, readable one-line IF ... THEN ... rule summary.
 */
export function formatRuleSummary(rule: Rule, devices: Device[]): string {
  const devMap = new Map(devices.map((d) => [d.id, d.name]));

  // Conditions
  const conditionParts: string[] = [];
  for (const c of rule.conditionGroup.conditions) {
    if (c.deviceId) {
      const devName = devMap.get(c.deviceId) || c.deviceId;
      if (c.field === 'on') {
        conditionParts.push(`${devName} is ${c.value ? 'On' : 'Off'}`);
      } else if (c.field === 'locked') {
        conditionParts.push(`${devName} is ${c.value ? 'Locked' : 'Unlocked'}`);
      } else if (c.field === 'online') {
        conditionParts.push(`${devName} is ${c.value ? 'Online' : 'Offline'}`);
      } else {
        conditionParts.push(`${devName} ${c.field} ${c.operator} ${c.value}`);
      }
    } else if (c.field === 'ambientTemp') {
      conditionParts.push(`Temp ${c.operator} ${c.value}°C`);
    } else if (c.field === 'ambientHumidity') {
      conditionParts.push(`Humidity ${c.operator} ${c.value}%`);
    } else if (c.field === 'powerWatts' || c.field === 'totalWatts') {
      conditionParts.push(`Power ${c.operator} ${c.value}W`);
    } else {
      conditionParts.push(`${c.field} ${c.operator} ${c.value}`);
    }
  }

  if (rule.timeWindow) {
    conditionParts.push(`Time ${rule.timeWindow.start} - ${rule.timeWindow.end}`);
  }

  if (rule.weekdays && rule.weekdays.length > 0 && rule.weekdays.length < 7) {
    const dayLabels = rule.weekdays.map((d) => WEEKDAY_NAMES[d] || String(d)).join(', ');
    conditionParts.push(`Days: ${dayLabels}`);
  }

  const ifPart = conditionParts.length > 0 ? conditionParts.join(` ${rule.conditionGroup.logic} `) : 'Always';

  // Actions
  const actionParts: string[] = [];
  for (const a of rule.actions) {
    const devName = devMap.get(a.deviceId) || a.deviceId;
    if (a.field === 'on') {
      actionParts.push(`Turn ${a.value ? 'On' : 'Off'} ${devName}`);
    } else if (a.field === 'brightness') {
      actionParts.push(`Set ${devName} brightness to ${a.value}%`);
    } else if (a.field === 'color') {
      actionParts.push(`Set ${devName} color to ${a.value}`);
    } else if (a.field === 'target') {
      actionParts.push(`Set ${devName} target to ${a.value}°C`);
    } else if (a.field === 'locked') {
      actionParts.push(`${a.value ? 'Lock' : 'Unlock'} ${devName}`);
    } else {
      actionParts.push(`Set ${devName} ${a.field} to ${a.value}`);
    }
  }

  const thenPart = actionParts.length > 0 ? actionParts.join(', ') : 'No actions';

  return `IF ${ifPart} THEN ${thenPart}`;
}

/**
 * Computes next-eligible state (ready or cooldown active with remaining minutes).
 */
export function getNextEligibleState(
  rule: Rule,
  currentTime: number
): { status: 'ready' | 'cooldown' | 'disabled'; label: string } {
  if (!rule.enabled) {
    return { status: 'disabled', label: 'Disabled' };
  }

  if (!rule.lastTriggeredAt || rule.cooldownMinutes <= 0) {
    return { status: 'ready', label: 'Ready' };
  }

  const cooldownMs = rule.cooldownMinutes * 60 * 1000;
  const elapsed = currentTime - rule.lastTriggeredAt;
  if (elapsed >= cooldownMs) {
    return { status: 'ready', label: 'Ready' };
  }

  const remainingMinutes = Math.ceil((cooldownMs - elapsed) / 60000);
  return {
    status: 'cooldown',
    label: `Cooldown active (${remainingMinutes}m remaining)`,
  };
}

