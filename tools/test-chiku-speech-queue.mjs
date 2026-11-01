// Comprehensive unit test suite for ChikuSpeechQueue (lib/chiku-speech-queue.ts)
import assert from 'node:assert/strict';
import { ChikuSpeechQueue } from '../lib/chiku-speech-queue.ts';

class FakeClock {
  constructor(initialTime = 1000) {
    this.currentTime = initialTime;
    this.timers = [];
    this.nextTimerId = 1;
  }

  now() {
    return this.currentTime;
  }

  setTimeout(fn, ms) {
    const id = this.nextTimerId++;
    this.timers.push({ id, fn, triggerAt: this.currentTime + ms });
    this.timers.sort((a, b) => a.triggerAt - b.triggerAt);
    return id;
  }

  clearTimeout(id) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }

  tick(ms) {
    const targetTime = this.currentTime + ms;
    while (this.timers.length > 0 && this.timers[0].triggerAt <= targetTime) {
      const nextTimer = this.timers.shift();
      this.currentTime = nextTimer.triggerAt;
      nextTimer.fn();
    }
    this.currentTime = targetTime;
  }
}

class FakeSpeechAdapter {
  constructor() {
    this.spokenTexts = [];
    this.currentUtterance = null;
    this.cancelCalls = 0;
    this.resumeCalls = 0;
  }

  speak(text, handlers, isRetry = false) {
    const entry = { text, handlers, isRetry };
    this.spokenTexts.push(entry);
    this.currentUtterance = entry;
  }

  cancel() {
    this.cancelCalls++;
    if (this.currentUtterance && this.currentUtterance.handlers.onError) {
      const cur = this.currentUtterance;
      this.currentUtterance = null;
      cur.handlers.onError('canceled');
    } else {
      this.currentUtterance = null;
    }
  }

  resume() {
    this.resumeCalls++;
  }

  simulateStart() {
    if (this.currentUtterance && this.currentUtterance.handlers.onStart) {
      this.currentUtterance.handlers.onStart();
    }
  }

  simulateEnd() {
    if (this.currentUtterance && this.currentUtterance.handlers.onEnd) {
      const cur = this.currentUtterance;
      this.currentUtterance = null;
      cur.handlers.onEnd();
    }
  }

  simulateError(error) {
    if (this.currentUtterance && this.currentUtterance.handlers.onError) {
      const cur = this.currentUtterance;
      this.currentUtterance = null;
      cur.handlers.onError(error);
    }
  }
}

console.log('Running Chiku Speech Queue Unit Tests...\n');

// SCENARIO (a): Welcome then 4 mode changes that each finish normally: all 5 are spoken
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  queue.enqueue({
    key: 'welcome',
    group: 'view',
    priority: 3,
    parts: ['Welcome to Terra Pulse!'],
  });
  adapter.simulateStart();
  adapter.simulateEnd();

  const modes = ['flood', 'deforestation', 'river-erosion', 'surface-water'];
  for (const m of modes) {
    clock.tick(2000); // Beyond 1500ms duplicate window
    queue.enqueue({
      key: `mode:${m}`,
      group: 'view',
      priority: 2,
      parts: [`Mode ${m} ready`],
    });
    adapter.simulateStart();
    adapter.simulateEnd();
  }

  assert.equal(adapter.spokenTexts.length, 5, 'All 5 items must be spoken');
  assert.equal(adapter.spokenTexts[0].text, 'Welcome to Terra Pulse!');
  assert.equal(adapter.spokenTexts[1].text, 'Mode flood ready');
  assert.equal(adapter.spokenTexts[2].text, 'Mode deforestation ready');
  assert.equal(adapter.spokenTexts[3].text, 'Mode river-erosion ready');
  assert.equal(adapter.spokenTexts[4].text, 'Mode surface-water ready');
  console.log('✓ (a) Welcome then 4 mode changes finish normally: all 5 spoken');
}

// SCENARIO (b): Adapter whose onend never fires: later events still speak after budget expires
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  // Short text: length 5 -> budget = max(2500, 90*5) + 1500 = 4000ms
  queue.enqueue({
    key: 'hang',
    group: 'view',
    priority: 2,
    parts: ['Short'],
  });
  adapter.simulateStart();
  // onend NEVER fires!

  // Next event arrives while 'hang' is speaking; lower priority or same group
  clock.tick(500);
  queue.enqueue({
    key: 'next',
    group: 'upload',
    priority: 1, // Queued
    parts: ['Upload done'],
  });

  assert.equal(adapter.spokenTexts.length, 1, 'Only first item spoken before budget');

  // Advance clock past 4000ms budget
  clock.tick(3600); // Total 4100ms
  assert.equal(adapter.spokenTexts.length, 2, 'Second item must speak after budget timeout');
  assert.equal(adapter.spokenTexts[1].text, 'Upload done');

  const budgetLog = logs.find((l) => l.decision === 'budget-timeout');
  assert.ok(budgetLog, 'Must log budget-timeout decision');
  console.log('✓ (b) onend never fires: later events speak after budget timeout');
}

// SCENARIO (c): 10 rapid case switches: only the last is spoken
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  // Case 1 starts
  queue.enqueue({
    key: 'case:1',
    group: 'view',
    priority: 2,
    parts: ['Case 1'],
  });
  adapter.simulateStart();

  // Rapidly trigger cases 2 to 10 within 10ms intervals (faster than 80ms cancel delay)
  for (let i = 2; i <= 10; i++) {
    clock.tick(10);
    queue.enqueue({
      key: `case:${i}`,
      group: 'view',
      priority: 2,
      parts: [`Case ${i}`],
    });
  }

  // Allow 80ms preemption delay to trigger
  clock.tick(100);

  // Spoken texts: Case 1 (preempted) and Case 10 (the survivor)
  assert.equal(adapter.spokenTexts.length, 2, 'Only Case 1 and Case 10 spoken');
  assert.equal(adapter.spokenTexts[0].text, 'Case 1');
  assert.equal(adapter.spokenTexts[1].text, 'Case 10');

  // Verify intermediate cases 2..9 were replaced/preempted
  const replaced = logs.filter((l) => l.decision === 'replaced' || l.decision === 'cancelled-superseded');
  assert.ok(replaced.length >= 8, 'Intermediate rapid switches must be replaced or superseded');
  console.log('✓ (c) 10 rapid case switches: intermediate replaced, only last spoken');
}

// SCENARIO (d): Low-priority event during high-priority line is queued and spoken; queued > 8s discarded
{
  // Part 1: Queued and spoken
  {
    const clock = new FakeClock();
    const adapter = new FakeSpeechAdapter();
    const logs = [];

    const queue = new ChikuSpeechQueue({
      adapter,
      clock,
      onDecision: (d) => logs.push(d),
    });

    queue.enqueue({
      key: 'welcome',
      group: 'view',
      priority: 3,
      parts: ['Welcome high priority'],
    });
    adapter.simulateStart();

    clock.tick(200);
    queue.enqueue({
      key: 'hint:slider',
      group: 'hint',
      priority: 1,
      parts: ['Drag the slider'],
    });

    assert.equal(adapter.spokenTexts.length, 1, 'Low priority queued while p3 speaking');
    const queueLog = logs.find((l) => l.decision === 'queued');
    assert.ok(queueLog, 'Must log queued decision');

    adapter.simulateEnd();
    assert.equal(adapter.spokenTexts.length, 2, 'Low priority spoken after p3 ends');
    assert.equal(adapter.spokenTexts[1].text, 'Drag the slider');
  }

  // Part 2: Queued event older than 8s is discarded
  {
    const clock = new FakeClock();
    const adapter = new FakeSpeechAdapter();
    const logs = [];

    const queue = new ChikuSpeechQueue({
      adapter,
      clock,
      onDecision: (d) => logs.push(d),
      staleEventTimeoutMs: 8000,
    });

    queue.enqueue({
      key: 'analysis',
      group: 'analysis',
      priority: 3,
      parts: [
        'Long analysis headline with detailed radar findings speaking for a prolonged duration exceeding eight seconds across the monitoring region.',
      ],
    });
    adapter.simulateStart();

    clock.tick(100);
    queue.enqueue({
      key: 'hint:table',
      group: 'hint',
      priority: 1,
      parts: ['Hint table'],
    });

    // High priority speech takes 8500ms
    clock.tick(8500);
    adapter.simulateEnd();

    assert.equal(adapter.spokenTexts.length, 1, 'Stale event must not be spoken');
    const staleLog = logs.find((l) => l.decision === 'discarded-stale');
    assert.ok(staleLog, 'Must log discarded-stale decision');
    assert.ok(staleLog.reason.includes('older than 8000ms'), 'Log reason must mention age');
  }
  console.log('✓ (d) Low priority queued and spoken; queued > 8s discarded with logged reason');
}

// SCENARIO (e): Two-part analysis line plays in order, cancelled as a whole when higher event arrives
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  queue.enqueue({
    key: 'analysis-ready',
    group: 'analysis',
    priority: 3,
    parts: ['Part 1: Headline result', 'Part 2: Sensitivity sentence'],
  });

  assert.equal(adapter.spokenTexts.length, 1);
  assert.equal(adapter.spokenTexts[0].text, 'Part 1: Headline result');

  adapter.simulateStart();
  adapter.simulateEnd();

  // Part 2 begins automatically
  assert.equal(adapter.spokenTexts.length, 2);
  assert.equal(adapter.spokenTexts[1].text, 'Part 2: Sensitivity sentence');
  adapter.simulateStart();

  // High priority event arrives while Part 2 is speaking
  clock.tick(100);
  queue.enqueue({
    key: 'stop-or-case',
    group: 'view',
    priority: 3,
    parts: ['New case selected'],
  });

  clock.tick(100);
  assert.equal(adapter.spokenTexts.length, 3);
  assert.equal(adapter.spokenTexts[2].text, 'New case selected');
  console.log('✓ (e) Multi-part analysis line plays in order and is cancelled as a whole');
}

// SCENARIO (f): Duplicate key within 1500 ms ignored, speaks again later
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  queue.enqueue({
    key: 'mode:flood',
    group: 'view',
    priority: 2,
    parts: ['Flood mode ready'],
  });
  adapter.simulateStart();
  adapter.simulateEnd();

  // Duplicate at 500ms
  clock.tick(500);
  queue.enqueue({
    key: 'mode:flood',
    group: 'view',
    priority: 2,
    parts: ['Flood mode ready duplicate'],
  });

  assert.equal(adapter.spokenTexts.length, 1, 'Duplicate within 1500ms must not speak');
  const dupLog = logs.find((l) => l.decision === 'ignored-duplicate');
  assert.ok(dupLog, 'Must log ignored-duplicate');

  // Advance past 1500ms window
  clock.tick(1200); // 1700ms total
  queue.enqueue({
    key: 'mode:flood',
    group: 'view',
    priority: 2,
    parts: ['Flood mode ready after window'],
  });

  assert.equal(adapter.spokenTexts.length, 2, 'Speaks again once duplicate window passes');
  assert.equal(adapter.spokenTexts[1].text, 'Flood mode ready after window');
  console.log('✓ (f) Duplicate key within 1500ms ignored, speaks again later');
}

// SCENARIO (g): onerror "interrupted" is not counted as a failure
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
  });

  queue.enqueue({
    key: 'test:interrupted',
    group: 'view',
    priority: 2,
    parts: ['Will be interrupted'],
  });
  adapter.simulateStart();
  adapter.simulateError('interrupted');

  const errorLog = logs.find((l) => l.decision === 'failed-error');
  assert.equal(errorLog, undefined, 'interrupted error must not be counted as failed-error');
  console.log('✓ (g) onerror interrupted is not counted as a failure');
}

// SCENARIO (h): Watchdog retry path
{
  const clock = new FakeClock();
  const adapter = new FakeSpeechAdapter();
  const logs = [];

  const queue = new ChikuSpeechQueue({
    adapter,
    clock,
    onDecision: (d) => logs.push(d),
    watchdogTimeoutMs: 1500,
  });

  queue.enqueue({
    key: 'test:watchdog',
    group: 'view',
    priority: 2,
    parts: ['Watchdog test'],
  });

  assert.equal(adapter.spokenTexts.length, 1);
  assert.equal(adapter.spokenTexts[0].isRetry, false);

  // 1500ms elapse without onStart
  clock.tick(1501);
  // Preempt/retry delay
  clock.tick(100);

  assert.equal(adapter.spokenTexts.length, 2, 'Watchdog must trigger retry speak()');
  assert.equal(adapter.spokenTexts[1].isRetry, true);

  const retryLog = logs.find((l) => l.decision === 'watchdog-retry');
  assert.ok(retryLog, 'Must log watchdog-retry');

  // Retry succeeds
  adapter.simulateStart();
  adapter.simulateEnd();

  assert.equal(queue.isSpeaking, false, 'Speech queue idle after retry completes');
  console.log('✓ (h) Watchdog retry path successfully triggered and completed');
}

console.log('\nAll 8 Chiku Speech Queue test scenarios passed successfully!');
