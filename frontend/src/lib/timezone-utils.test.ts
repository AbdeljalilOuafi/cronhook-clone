/**
 * Test file for timezone utilities
 * Run these tests in the browser console to verify timezone conversions
 */

import { convertLocalToUTC, convertUTCToLocal, formatUTCForDisplay, getUserTimezone } from './timezone-utils';

export function runTimezoneTests() {
  console.group('🧪 Timezone Utilities Tests');
  
  // Test 1: convertLocalToUTC
  console.group('Test 1: convertLocalToUTC');
  const testLocal = '2025-10-25T10:00';
  const testUTC = convertLocalToUTC(testLocal);
  console.log('Input (local):', testLocal);
  console.log('Output (UTC):', testUTC);
  console.log('Expected format: ISO 8601 with Z suffix');
  console.log('Has Z suffix:', testUTC.endsWith('Z'));
  console.groupEnd();
  
  // Test 2: convertUTCToLocal
  console.group('Test 2: convertUTCToLocal');
  const testUTCInput = '2025-10-25T09:00:00Z';
  const testLocalOutput = convertUTCToLocal(testUTCInput);
  console.log('Input (UTC):', testUTCInput);
  console.log('Output (local):', testLocalOutput);
  console.log('Expected format: YYYY-MM-DDTHH:mm');
  console.log('Matches format:', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(testLocalOutput));
  console.groupEnd();
  
  // Test 3: Round-trip conversion
  console.group('Test 3: Round-trip Conversion');
  const original = '2025-10-25T10:00';
  const toUTC = convertLocalToUTC(original);
  const backToLocal = convertUTCToLocal(toUTC);
  console.log('Original:', original);
  console.log('→ To UTC:', toUTC);
  console.log('→ Back to local:', backToLocal);
  console.log('Match:', original === backToLocal);
  console.groupEnd();
  
  // Test 4: formatUTCForDisplay
  console.group('Test 4: formatUTCForDisplay');
  const displayTest = formatUTCForDisplay('2025-10-25T09:00:00Z');
  console.log('Input:', '2025-10-25T09:00:00Z');
  console.log('Formatted:', displayTest);
  console.log('Is readable string:', typeof displayTest === 'string' && displayTest.length > 0);
  console.groupEnd();
  
  // Test 5: getUserTimezone
  console.group('Test 5: getUserTimezone');
  const timezone = getUserTimezone();
  console.log('User timezone:', timezone);
  console.log('Format (UTC±offset):', /^UTC[+-]\d+$/.test(timezone));
  console.groupEnd();
  
  // Test 6: Current time
  console.group('Test 6: Current Time Conversion');
  const now = new Date();
  const nowLocal = now.toISOString().slice(0, 16);
  const nowUTC = convertLocalToUTC(nowLocal);
  const nowDisplay = formatUTCForDisplay(nowUTC);
  console.log('Current time (local):', nowLocal);
  console.log('Current time (UTC):', nowUTC);
  console.log('Current time (display):', nowDisplay);
  console.groupEnd();
  
  // Test 7: Edge case - empty string
  console.group('Test 7: Edge Cases');
  console.log('Empty string to UTC:', convertLocalToUTC(''));
  console.log('Empty string to Local:', convertUTCToLocal(''));
  console.log('Empty string format:', formatUTCForDisplay(''));
  console.log('All return empty strings:', 
    convertLocalToUTC('') === '' && 
    convertUTCToLocal('') === '' && 
    formatUTCForDisplay('') === ''
  );
  console.groupEnd();
  
  // Test 8: Timezone offset calculation
  console.group('Test 8: Timezone Offset Validation');
  const offsetMinutes = -new Date().getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  const userTz = getUserTimezone();
  console.log('Offset (minutes):', offsetMinutes);
  console.log('Offset (hours):', offsetHours);
  console.log('User TZ string:', userTz);
  console.log('Expected:', `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`);
  console.groupEnd();
  
  console.groupEnd();
  console.log('✅ All timezone utility tests completed!');
  console.log('📝 Review the output above to verify conversions are correct for your timezone.');
}

// Auto-run tests if in development mode
if (import.meta.env.DEV) {
  console.log('💡 Run runTimezoneTests() to test timezone utilities');
}
