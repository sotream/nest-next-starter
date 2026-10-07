import { Injectable } from '@nestjs/common';
import type { EventPublisher } from './event-publisher.port.js';

/** Used when Kafka is disabled, so callers publish unconditionally. */
@Injectable()
export class NoopEventPublisher implements EventPublisher {
  publish(): Promise<void> {
    return Promise.resolve();
  }
}
