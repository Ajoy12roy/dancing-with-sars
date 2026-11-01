/**
 * Chiku Speech Queue & Scheduler
 * Pure TypeScript module with no React or window dependencies.
 * Takes an injected SpeechAdapter and ClockTimerAdapter.
 */

export type ChikuEventGroup =
  | 'view'
  | 'analysis'
  | 'upload'
  | 'page'
  | 'hint'
  | 'ai'
  | 'notes';

export type ChikuPriority = 1 | 2 | 3;

export type SpeechDecision =
  | 'spoken'
  | 'queued'
  | 'replaced'
  | 'discarded-stale'
  | 'ignored-duplicate'
  | 'ignored-voice-off'
  | 'budget-timeout'
  | 'cancelled-superseded'
  | 'watchdog-retry'
  | 'failed-error'
  | 'stopped';

export interface SpeechDecisionLog {
  timestamp: number;
  eventKey: string;
  group: ChikuEventGroup;
  priority: ChikuPriority;
  decision: SpeechDecision;
  reason: string;
}

export interface ChikuSpeechEvent {
  key: string;
  group: ChikuEventGroup;
  priority: ChikuPriority;
  parts: string[];
  timestamp?: number;
  caseId?: string;
}

export interface SpeechAdapterHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface SpeechAdapter {
  speak: (text: string, handlers: SpeechAdapterHandlers, isRetry?: boolean) => void;
  cancel: () => void;
  resume?: () => void;
}

export type TimerHandle = ReturnType<typeof setTimeout> | number;

export interface ClockTimerAdapter {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => TimerHandle;
  clearTimeout: (timerId: TimerHandle) => void;
}

export interface ChikuSpeechQueueOptions {
  adapter: SpeechAdapter;
  clock?: ClockTimerAdapter;
  isVoiceEnabled?: () => boolean;
  onDecision?: (log: SpeechDecisionLog) => void;
  onSpeakingStateChange?: (isSpeaking: boolean, text: string | null) => void;
  onStatusMessage?: (status: string | null) => void;
  cancelSpeakDelayMs?: number;
  watchdogTimeoutMs?: number;
  duplicateWindowMs?: number;
  staleEventTimeoutMs?: number;
}

interface ActiveSpeech {
  event: ChikuSpeechEvent;
  partIndex: number;
  text: string;
  startedAt: number;
  isRetryingWatchdog: boolean;
  watchdogTimer: TimerHandle | null;
  budgetTimer: TimerHandle | null;
}

const DEFAULT_CLOCK: ClockTimerAdapter = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export class ChikuSpeechQueue {
  private adapter: SpeechAdapter;
  private clock: ClockTimerAdapter;
  private isVoiceEnabledCheck: () => boolean;
  private onDecision?: (log: SpeechDecisionLog) => void;
  private onSpeakingStateChange?: (isSpeaking: boolean, text: string | null) => void;
  private onStatusMessage?: (status: string | null) => void;

  private cancelSpeakDelayMs: number;
  private watchdogTimeoutMs: number;
  private duplicateWindowMs: number;
  private staleEventTimeoutMs: number;

  private currentSpeech: ActiveSpeech | null = null;
  private queue: ChikuSpeechEvent[] = [];
  private lastKeyTimestamps: Map<string, number> = new Map();
  private pendingPreemptTimer: TimerHandle | null = null;
  private pendingSpeech: ChikuSpeechEvent | null = null;

  constructor(options: ChikuSpeechQueueOptions) {
    this.adapter = options.adapter;
    this.clock = options.clock || DEFAULT_CLOCK;
    this.isVoiceEnabledCheck = options.isVoiceEnabled || (() => true);
    this.onDecision = options.onDecision;
    this.onSpeakingStateChange = options.onSpeakingStateChange;
    this.onStatusMessage = options.onStatusMessage;

    this.cancelSpeakDelayMs = options.cancelSpeakDelayMs ?? 80;
    this.watchdogTimeoutMs = options.watchdogTimeoutMs ?? 1500;
    this.duplicateWindowMs = options.duplicateWindowMs ?? 1500;
    this.staleEventTimeoutMs = options.staleEventTimeoutMs ?? 8000;
  }

  public get isSpeaking(): boolean {
    return this.currentSpeech !== null;
  }

  public get currentPriority(): number {
    return this.currentSpeech ? this.currentSpeech.event.priority : 0;
  }

  public get queuedCount(): number {
    return this.queue.length;
  }

  public enqueue(event: ChikuSpeechEvent): void {
    const now = this.clock.now();
    const eventWithTime: ChikuSpeechEvent = {
      ...event,
      timestamp: event.timestamp ?? now,
    };

    // 1. Voice Enabled check
    if (!this.isVoiceEnabledCheck()) {
      this.logDecision(eventWithTime, 'ignored-voice-off', 'Voice is disabled in settings');
      return;
    }

    // 2. Duplicate key check within duplicateWindowMs
    const lastTime = this.lastKeyTimestamps.get(event.key);
    if (lastTime !== undefined && now - lastTime < this.duplicateWindowMs) {
      this.logDecision(
        eventWithTime,
        'ignored-duplicate',
        `Duplicate key within ${this.duplicateWindowMs}ms`
      );
      return;
    }
    this.lastKeyTimestamps.set(event.key, now);

    // 3. Remove/replace existing queued events in the same group
    const remainingQueue: ChikuSpeechEvent[] = [];
    for (const qItem of this.queue) {
      if (qItem.group === event.group) {
        this.logDecision(
          qItem,
          'replaced',
          `Replaced in queue by newer event in group "${event.group}"`
        );
      } else {
        remainingQueue.push(qItem);
      }
    }
    this.queue = remainingQueue;

    // 4. If an event is already pending in the transition delay window
    if (this.pendingSpeech !== null) {
      if (this.pendingSpeech.group === event.group || event.priority >= this.pendingSpeech.priority) {
        this.logDecision(
          this.pendingSpeech,
          'replaced',
          `Replaced in transition delay by newer event "${event.key}"`
        );
        this.pendingSpeech = eventWithTime;
        if (this.pendingPreemptTimer) {
          this.clock.clearTimeout(this.pendingPreemptTimer);
        }
        this.pendingPreemptTimer = this.clock.setTimeout(() => {
          this.pendingPreemptTimer = null;
          const toSpeak = this.pendingSpeech;
          this.pendingSpeech = null;
          if (toSpeak) {
            this.adapter.resume?.();
            this.startEvent(toSpeak);
          }
        }, this.cancelSpeakDelayMs);
        return;
      }
    }

    // 5. Evaluate against current active speech
    if (this.currentSpeech === null) {
      // Nothing is currently speaking: start immediately
      this.logDecision(eventWithTime, 'spoken', 'Started immediately (idle queue)');
      this.startEvent(eventWithTime);
      return;
    }

    // Something is currently speaking: compare priority
    if (event.priority >= this.currentSpeech.event.priority) {
      // Priority >= current: preempt and cancel active speech
      const preempted = this.currentSpeech.event;
      this.logDecision(
        preempted,
        'cancelled-superseded',
        `Preempted by incoming priority ${event.priority} event "${event.key}"`
      );
      this.logDecision(
        eventWithTime,
        'spoken',
        `Preempts priority ${preempted.priority} active event "${preempted.key}"`
      );

      this.clearActiveTimers(this.currentSpeech);
      this.currentSpeech = null;
      this.adapter.cancel();

      if (this.pendingPreemptTimer) {
        this.clock.clearTimeout(this.pendingPreemptTimer);
      }

      this.pendingSpeech = eventWithTime;
      this.pendingPreemptTimer = this.clock.setTimeout(() => {
        this.pendingPreemptTimer = null;
        const toSpeak = this.pendingSpeech;
        this.pendingSpeech = null;
        if (toSpeak) {
          this.adapter.resume?.();
          this.startEvent(toSpeak);
        }
      }, this.cancelSpeakDelayMs);
    } else {
      // Lower priority: queue behind active speech (do NOT drop)
      this.queue.push(eventWithTime);
      this.logDecision(
        eventWithTime,
        'queued',
        `Queued behind active priority ${this.currentSpeech.event.priority} speech`
      );
    }
  }

  public stop(): void {
    if (this.pendingPreemptTimer) {
      this.clock.clearTimeout(this.pendingPreemptTimer);
      this.pendingPreemptTimer = null;
    }
    if (this.pendingSpeech) {
      this.logDecision(this.pendingSpeech, 'stopped', 'Pending speech cancelled by stop');
      this.pendingSpeech = null;
    }

    if (this.currentSpeech) {
      this.logDecision(
        this.currentSpeech.event,
        'stopped',
        'Speech stopped and cancelled by user'
      );
      this.clearActiveTimers(this.currentSpeech);
      this.currentSpeech = null;
    }

    while (this.queue.length > 0) {
      const q = this.queue.shift()!;
      this.logDecision(q, 'stopped', 'Queue cleared by user stop');
    }

    this.adapter.cancel();
    this.onSpeakingStateChange?.(false, null);
  }

  private startEvent(event: ChikuSpeechEvent): void {
    if (!event.parts || event.parts.length === 0) {
      this.processQueue();
      return;
    }

    const firstText = event.parts[0] ?? '';
    const active: ActiveSpeech = {
      event,
      partIndex: 0,
      text: firstText,
      startedAt: this.clock.now(),
      isRetryingWatchdog: false,
      watchdogTimer: null,
      budgetTimer: null,
    };
    this.currentSpeech = active;
    this.speakActivePart(active);
  }

  private speakActivePart(active: ActiveSpeech): void {
    if (active.partIndex >= active.event.parts.length) {
      this.currentSpeech = null;
      this.processQueue();
      return;
    }

    const text = active.event.parts[active.partIndex] ?? '';
    active.text = text;

    // Time budget calculation: max(2500, 90 * characters) + 1500 ms
    const budgetMs = Math.max(2500, 90 * text.length) + 1500;

    // Notify speaking state with current part text
    this.onSpeakingStateChange?.(true, text);

    // Watchdog timer: onstart must fire within watchdogTimeoutMs
    active.watchdogTimer = this.clock.setTimeout(() => {
      this.handleWatchdogTimeout(active);
    }, this.watchdogTimeoutMs);

    // Safety budget timer: do not trust onend alone
    active.budgetTimer = this.clock.setTimeout(() => {
      this.handleBudgetTimeout(active, budgetMs);
    }, budgetMs);

    this.adapter.resume?.();

    const handlers: SpeechAdapterHandlers = {
      onStart: () => {
        if (active.watchdogTimer) {
          this.clock.clearTimeout(active.watchdogTimer);
          active.watchdogTimer = null;
        }
        this.onSpeakingStateChange?.(true, text);
        this.onStatusMessage?.(null);
      },
      onEnd: () => {
        this.clearActiveTimers(active);
        // Advance to next part of multi-part line
        active.partIndex++;
        active.isRetryingWatchdog = false;
        if (active.partIndex < active.event.parts.length) {
          this.speakActivePart(active);
        } else {
          this.currentSpeech = null;
          this.processQueue();
        }
      },
      onError: (error: string) => {
        this.clearActiveTimers(active);

        // Expected cancelations
        if (error === 'interrupted' || error === 'canceled') {
          return;
        }

        // Retryable failures: retry once
        if (
          !active.isRetryingWatchdog &&
          ['synthesis-failed', 'synthesis-unavailable', 'network', 'audio-busy'].includes(
            error
          )
        ) {
          active.isRetryingWatchdog = true;
          this.logDecision(
            active.event,
            'watchdog-retry',
            `Retrying part ${active.partIndex + 1} due to error "${error}"`
          );
          this.adapter.cancel();
          this.clock.setTimeout(() => {
            this.adapter.resume?.();
            this.speakActivePart(active);
          }, this.cancelSpeakDelayMs);
          return;
        }

        this.logDecision(active.event, 'failed-error', `Speech error: ${error}`);
        if (error === 'not-allowed') {
          this.onStatusMessage?.('Blocked by browser: press Voice on');
        } else {
          this.onStatusMessage?.(`Voice error: ${error}`);
        }

        this.currentSpeech = null;
        this.processQueue();
      },
    };

    try {
      this.adapter.speak(text, handlers, active.isRetryingWatchdog);
    } catch {
      this.clearActiveTimers(active);
      this.logDecision(active.event, 'failed-error', 'Adapter speak() threw exception');
      this.onStatusMessage?.('Voice unavailable on this device');
      this.currentSpeech = null;
      this.processQueue();
    }
  }

  private handleWatchdogTimeout(active: ActiveSpeech): void {
    if (active.watchdogTimer) {
      this.clock.clearTimeout(active.watchdogTimer);
      active.watchdogTimer = null;
    }

    if (!active.isRetryingWatchdog) {
      active.isRetryingWatchdog = true;
      this.logDecision(
        active.event,
        'watchdog-retry',
        `Watchdog: onstart did not fire within ${this.watchdogTimeoutMs}ms, retrying`
      );
      this.adapter.cancel();
      this.clock.setTimeout(() => {
        this.adapter.resume?.();
        this.speakActivePart(active);
      }, this.cancelSpeakDelayMs);
    } else {
      this.clearActiveTimers(active);
      this.logDecision(
        active.event,
        'failed-error',
        'Watchdog: retry voice also failed to start'
      );
      this.onStatusMessage?.('Voice unavailable on this device');
      this.currentSpeech = null;
      this.processQueue();
    }
  }

  private handleBudgetTimeout(active: ActiveSpeech, budgetMs: number): void {
    this.clearActiveTimers(active);
    this.logDecision(
      active.event,
      'budget-timeout',
      `Time budget of ${budgetMs}ms expired for part ${active.partIndex + 1}; force advancing`
    );

    // Force cancel hung utterance and continue with queue
    this.adapter.cancel();
    this.currentSpeech = null;
    this.processQueue();
  }

  private processQueue(): void {
    const now = this.clock.now();

    while (this.queue.length > 0) {
      const candidate = this.queue.shift()!;
      const age = now - (candidate.timestamp ?? now);

      if (age > this.staleEventTimeoutMs) {
        this.logDecision(
          candidate,
          'discarded-stale',
          `Queued event older than ${this.staleEventTimeoutMs}ms (${Math.round(age)}ms old)`
        );
        continue;
      }

      this.logDecision(
        candidate,
        'spoken',
        `Started speaking from queue after ${Math.round(age)}ms wait`
      );
      this.startEvent(candidate);
      return;
    }

    // Queue is empty
    this.currentSpeech = null;
    this.onSpeakingStateChange?.(false, null);
  }

  private clearActiveTimers(active: ActiveSpeech): void {
    if (active.watchdogTimer) {
      this.clock.clearTimeout(active.watchdogTimer);
      active.watchdogTimer = null;
    }
    if (active.budgetTimer) {
      this.clock.clearTimeout(active.budgetTimer);
      active.budgetTimer = null;
    }
  }

  private logDecision(
    event: ChikuSpeechEvent,
    decision: SpeechDecision,
    reason: string
  ): void {
    if (!this.onDecision) return;
    this.onDecision({
      timestamp: this.clock.now(),
      eventKey: event.key,
      group: event.group,
      priority: event.priority,
      decision,
      reason,
    });
  }
}
