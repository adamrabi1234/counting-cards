/** Absolute monotonic deadlines. A late frame never silently skips a card. */
export class ExposureClock {
  index = 0;
  paused = false;
  finished = false;
  eligible = true;
  lateness = 0;
  private startAt: number;
  private deadline: number;
  private pauseAt = 0;
  private pauseTotal = 0;
  private scheduleOffset = 0;
  private endAt: number | null = null;
  constructor(readonly count: number, readonly interval: number, now: number) {
    if (!Number.isInteger(count) || count < 1 || !Number.isFinite(interval) || interval < 100) throw new RangeError('Neplatné časování.');
    this.startAt = now; this.deadline = now + interval;
  }
  tick(now: number): 'none' | 'advance' | 'paused' | 'done' {
    if (this.finished || this.paused || now < this.deadline) return 'none';
    if (now - this.deadline > Math.min(150, this.interval / 2)) { this.lateness = now - this.deadline; this.pause(now); return 'paused'; }
    if (this.index + 1 >= this.count) { this.finished = true; this.endAt = now; return 'done'; }
    this.index++; this.deadline = this.startAt + this.scheduleOffset + (this.index + 1) * this.interval;
    return 'advance';
  }
  pause(now: number) {
    if (this.paused || this.finished) return;
    this.paused = true; this.eligible = false; this.pauseAt = now;
    // If a deadline was missed, resume the current card for a full interval.
    if (this.deadline <= now) {
      this.scheduleOffset += now + this.interval - this.deadline;
      this.deadline = now + this.interval;
    }
  }
  resume(now: number) {
    if (!this.paused || this.finished) return;
    const duration = now - this.pauseAt;
    this.deadline += duration;
    this.pauseTotal += duration;
    this.scheduleOffset += duration;
    this.paused = false;
  }
  elapsed(now: number) { return Math.max(0, (this.endAt ?? (this.paused ? this.pauseAt : now)) - this.startAt - this.pauseTotal); }
  fraction(now: number) { return Math.max(0, Math.min(1, 1 - (this.deadline - (this.paused ? this.pauseAt : now)) / this.interval)); }
}
