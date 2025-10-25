/**
 * Timezone Demo Component
 * 
 * This component demonstrates the timezone conversion functionality.
 * Useful for testing and verifying the timezone utilities work correctly.
 * 
 * Usage: Temporarily add to a page to test timezone conversions
 */

import { useState } from 'react';
import { convertLocalToUTC, convertUTCToLocal, formatUTCForDisplay, getUserTimezone } from '@/lib/timezone-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TimezoneDemo() {
  const [localInput, setLocalInput] = useState('');
  const [utcInput, setUtcInput] = useState('');

  const handleLocalChange = (value: string) => {
    setLocalInput(value);
    if (value) {
      const converted = convertLocalToUTC(value);
      setUtcInput(converted);
    }
  };

  const handleUtcChange = (value: string) => {
    setUtcInput(value);
    if (value) {
      const converted = convertUTCToLocal(value);
      setLocalInput(converted);
    }
  };

  const setCurrentTime = () => {
    const now = new Date();
    const local = now.toISOString().slice(0, 16);
    setLocalInput(local);
    setUtcInput(now.toISOString());
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🌍 Timezone Conversion Demo</CardTitle>
        <CardDescription>
          Test timezone conversion utilities - Your timezone: {getUserTimezone()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Button */}
        <div>
          <Button onClick={setCurrentTime} variant="outline">
            Set Current Time
          </Button>
        </div>

        {/* Local Time Input */}
        <div className="space-y-2">
          <Label htmlFor="local-time">Local Time (Your Timezone)</Label>
          <Input
            id="local-time"
            type="datetime-local"
            value={localInput}
            onChange={(e) => handleLocalChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Format: YYYY-MM-DDTHH:mm (for datetime-local input)
          </p>
        </div>

        {/* Conversion Arrow */}
        <div className="text-center text-2xl">⇅</div>

        {/* UTC Time Display */}
        <div className="space-y-2">
          <Label htmlFor="utc-time">UTC Time (What Backend Receives)</Label>
          <Input
            id="utc-time"
            type="text"
            value={utcInput}
            onChange={(e) => handleUtcChange(e.target.value)}
            placeholder="2025-10-25T09:00:00.000Z"
          />
          <p className="text-xs text-muted-foreground">
            Format: ISO 8601 with 'Z' suffix
          </p>
        </div>

        {/* Formatted Display */}
        {utcInput && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <Label>Formatted for Display (What User Sees)</Label>
            <p className="text-lg font-medium">
              {formatUTCForDisplay(utcInput)}
            </p>
          </div>
        )}

        {/* Info Panel */}
        <div className="space-y-2 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <h4 className="font-semibold">How It Works:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Enter a time in "Local Time" - it converts to UTC</li>
            <li>Or enter a UTC time - it converts to your local time</li>
            <li>"Formatted for Display" shows how users see times in the app</li>
            <li>The conversion is automatic based on your browser's timezone</li>
          </ul>
        </div>

        {/* Timezone Info */}
        <div className="space-y-2 p-4 border rounded-lg">
          <h4 className="font-semibold">Your Timezone Information:</h4>
          <div className="text-sm space-y-1">
            <p>
              <strong>Timezone Offset:</strong> {getUserTimezone()}
            </p>
            <p>
              <strong>UTC Offset (minutes):</strong> {-new Date().getTimezoneOffset()}
            </p>
            <p>
              <strong>Browser Locale:</strong> {Intl.DateTimeFormat().resolvedOptions().locale}
            </p>
            <p>
              <strong>Detected Timezone:</strong>{' '}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        </div>

        {/* Example Scenario */}
        <div className="space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
          <h4 className="font-semibold">✅ Example Scenario:</h4>
          <div className="text-sm space-y-2">
            <p>
              <strong>User in Morocco (UTC+1):</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Enters: <code className="bg-white dark:bg-gray-800 px-1 rounded">2025-10-25T10:00</code> (10:00 AM local)</li>
              <li>Backend receives: <code className="bg-white dark:bg-gray-800 px-1 rounded">2025-10-25T09:00:00.000Z</code> (9:00 AM UTC)</li>
              <li>Webhook executes: 9:00 AM UTC = 10:00 AM Morocco time ✓</li>
              <li>User sees: "25 Oct 2025, 10:00" (their local time) ✓</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
